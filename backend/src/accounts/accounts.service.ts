import {
  PrismaClient,
  TransactionType,
  AccountType,
  ResourcePermission,
  Prisma,
} from "@prisma/client";
import {
  AccountDTO,
  CreateAccountDTO,
  UpdateAccountDTO,
} from "@dindinho/shared";

/**
 * Erro base para operações de conta.
 * @description Classe base para todos os erros relacionados a contas.
 */
export abstract class AccountError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro quando conta com nome duplicado já existe.
 * @description Lançado quando usuário tenta criar conta com nome já existente.
 */
export class DuplicateAccountError extends AccountError {
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(accountName: string) {
    super(`Já existe uma conta com nome "${accountName}" para este usuário`, {
      accountName,
      code: "DUPLICATE_ACCOUNT_NAME",
    });
  }
}

/**
 * Erro quando usuário não é encontrado.
 * @description Lançado quando userId fornecido não existe no sistema.
 */
export class UserNotFoundError extends AccountError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(userId: string) {
    super(`Usuário não encontrado`, {
      userId,
      code: "USER_NOT_FOUND",
    });
  }
}

/**
 * Erro de validação de dados.
 * @description Lançado quando dados fornecidos são inválidos.
 */
export class AccountValidationError extends AccountError {
  readonly statusCode = 422;
  readonly isOperational = true;

  constructor(message: string, validationErrors?: unknown) {
    super(`Dados inválidos: ${message}`, {
      validationErrors,
      code: "VALIDATION_ERROR",
    });
  }
}

/**
 * Erro de conexão com banco de dados.
 * @description Lançado quando há problemas de conexão com o banco.
 */
export class DatabaseConnectionError extends AccountError {
  readonly statusCode = 503;
  readonly isOperational = true;

  constructor(originalError?: Error) {
    super("Erro de conexão com o banco de dados", {
      originalError: originalError?.message,
      code: "DATABASE_CONNECTION_ERROR",
    });
  }
}

/**
 * Erro de permissão.
 * @description Lançado quando usuário não tem permissão para acessar recurso.
 */
export class PermissionDeniedError extends AccountError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(action: string) {
    super(`Sem permissão para ${action} as contas`, {
      action,
      code: "PERMISSION_DENIED",
    });
  }
}

/**
 * Erro quando conta não é encontrada.
 * @description Lançado quando accountId fornecido não existe no sistema.
 */
export class AccountNotFoundError extends AccountError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(accountId: string) {
    super("Conta não encontrada", {
      accountId,
      code: "ACCOUNT_NOT_FOUND",
    });
  }
}

/**
 * Erro genérico de conta.
 * @description Erro não esperado em operações de conta.
 */
export class AccountOperationError extends AccountError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(operation: string, originalError?: Error) {
    super(`Erro inesperado ao ${operation} conta`, {
      operation,
      originalError: originalError?.message,
      code: "ACCOUNT_OPERATION_ERROR",
    });
  }
}

/**
 * Serviço responsável pelo gerenciamento de contas bancárias e cartões
 * @class AccountsService
 * @description Gerencia operações de criação, listagem e atualização de contas e cartões de crédito
 */
export class AccountsService {
  /**
   * Instância do PrismaClient para acesso ao banco de dados.
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * Converte um valor desconhecido para número de forma segura
   * @private
   * @param {unknown} value - Valor a ser convertido
   * @returns {number} Valor convertido ou 0
   */
  private toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      value &&
      typeof value === "object" &&
      "toNumber" in value &&
      typeof (value as { toNumber: () => unknown }).toNumber === "function"
    ) {
      const n = (value as { toNumber: () => number }).toNumber();
      return typeof n === "number" && Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  /**
   * Valida se o usuário tem permissão de escrita em uma conta
   * @private
   * @async
   * @param {string} userId - ID do usuário
   * @param {string} accountId - ID da conta
   * @throws {AccountNotFoundError} Caso a conta não exista
   * @throws {PermissionDeniedError} Caso o usuário não tenha permissão de escrita
   */
  private async assertCanWriteAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, ownerId: true },
    });

    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    if (account.ownerId === userId) return;

    const access = await this.prisma.accountAccess.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
      select: { permission: true },
    });

    if (
      !access ||
      (access.permission !== ResourcePermission.EDITOR &&
        access.permission !== ResourcePermission.OWNER)
    ) {
      throw new PermissionDeniedError("editar");
    }
  }

  /**
   * Constrói o DTO de uma conta com cálculos de saldo e limites
   * @private
   * @async
   * @param {string} userId - ID do usuário
   * @param {string} accountId - ID da conta
   * @returns {Promise<AccountDTO>} Dados formatados da conta
   * @throws {PermissionDeniedError} Caso o usuário não tenha acesso à conta
   */
  private async getAccountDTO(
    userId: string,
    accountId: string,
  ): Promise<AccountDTO> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        OR: [
          { ownerId: userId },
          {
            accessList: {
              some: { userId },
            },
          },
        ],
      },
      include: { creditCardInfo: true },
    });

    if (!account) {
      throw new PermissionDeniedError("acessar");
    }

    const paidSums = await this.prisma.transaction.groupBy({
      by: ["type"],
      where: {
        accountId,
        isPaid: true,
      },
      _sum: {
        amount: true,
      },
    });

    const sums = { income: 0, expense: 0, transfer: 0 };
    for (const row of paidSums) {
      const type = row.type as TransactionType;
      const amount = this.toNumber(row._sum?.amount);
      if (type === TransactionType.INCOME) sums.income += Math.abs(amount);
      else if (type === TransactionType.EXPENSE)
        sums.expense += Math.abs(amount);
      else if (type === TransactionType.TRANSFER) sums.transfer += amount;
    }

    const limit = account.creditCardInfo?.limit
      ? this.toNumber(account.creditCardInfo.limit)
      : null;

    const used =
      account.type === AccountType.CREDIT
        ? (() => {
            const rows = this.prisma.transaction.groupBy({
              by: ["accountId"],
              where: {
                accountId,
                type: TransactionType.EXPENSE,
                isPaid: false,
              },
              _sum: { amount: true },
            });
            return rows.then((r) =>
              r.length ? Math.abs(this.toNumber(r[0]?._sum?.amount)) : 0,
            );
          })()
        : Promise.resolve(0);

    const usedAmount = await used;

    const availableLimit =
      account.type === AccountType.CREDIT &&
      typeof limit === "number" &&
      Number.isFinite(limit)
        ? Math.max(0, limit - usedAmount)
        : null;

    const initialBalance = this.toNumber(account.initialBalance);
    const balance =
      account.type === AccountType.STANDARD
        ? initialBalance + sums.income - sums.expense + sums.transfer
        : 0;

    return {
      id: account.id,
      name: account.name,
      color: account.color,
      icon: account.icon,
      type: account.type,
      ownerId: account.ownerId,
      creditCardInfo: account.creditCardInfo
        ? {
            ...account.creditCardInfo,
            limit,
            availableLimit,
          }
        : null,
      balance,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  /**
   * Cria uma nova conta para um usuário.
   *
   * @param userId - ID do usuário proprietário da conta
   * @param data - Dados da conta a ser criada
   * @returns Conta criada com informações do cartão de crédito (se aplicável)
   *
   * @throws {DuplicateAccountError} Quando já existe conta com mesmo nome
   * @throws {UserNotFoundError} Quando usuário não é encontrado
   * @throws {AccountValidationError} Quando dados são inválidos
   * @throws {AccountOperationError} Quando ocorre erro inesperado
   *
   * @example
   * const account = await service.create('user-123', {
   *   name: 'Minha Conta',
   *   color: '#FF5722',
   *   icon: 'pi-wallet',
   *   type: 'STANDARD'
   * });
   */
  async create(userId: string, data: CreateAccountDTO): Promise<AccountDTO> {
    try {
      const creditCardData =
        data.type === "CREDIT" && data.closingDay && data.dueDay
          ? {
              create: {
                closingDay: data.closingDay,
                dueDay: data.dueDay,
                limit: data.limit,
                brand: data.brand,
              },
            }
          : undefined;

      const initialBalance =
        data.type === "STANDARD" ? this.toNumber(data.initialBalance) : 0;

      const account = await this.prisma.account.create({
        data: {
          name: data.name,
          color: data.color,
          icon: data.icon,
          type: data.type as AccountType,
          ownerId: userId,
          initialBalance,
          creditCardInfo: creditCardData,
        },
        include: {
          creditCardInfo: true,
        },
      });

      const limit = account.creditCardInfo?.limit
        ? this.toNumber(account.creditCardInfo.limit)
        : null;

      return {
        id: account.id,
        name: account.name,
        color: account.color,
        icon: account.icon,
        type: account.type,
        ownerId: account.ownerId,
        creditCardInfo: account.creditCardInfo
          ? {
              ...account.creditCardInfo,
              limit,
              availableLimit: limit,
            }
          : null,
        balance: account.type === AccountType.STANDARD ? initialBalance : 0,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };
    } catch (error) {
      return this.handleCreateAccountError(error, data.name);
    }
  }

  /**
   * Lista todas as contas de um usuário.
   *
   * @param userId - ID do usuário para buscar as contas
   * @returns Array de contas do usuário ordenadas por data de criação
   *
   * @throws {DatabaseConnectionError} Quando há problemas de conexão
   * @throws {PermissionDeniedError} Quando usuário não tem permissão
   * @throws {AccountOperationError} Quando ocorre erro inesperado
   *
   * @example
   * const accounts = await service.findAllByUserId('user-123');
   */
  async findAllByUserId(userId: string): Promise<AccountDTO[]> {
    try {
      const accounts = await this.prisma.account.findMany({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      });

      if (!accounts.length) return [];

      const accountIds = accounts.map((a) => a.id);
      const creditAccountIds = accounts
        .filter((w) => w.type === AccountType.CREDIT)
        .map((w) => w.id);

      const paidSums = await this.prisma.transaction.groupBy({
        by: ["accountId", "type"],
        where: {
          accountId: { in: accountIds },
          isPaid: true,
        },
        _sum: {
          amount: true,
        },
      });

      const paidByAccount = new Map<
        string,
        { income: number; expense: number; transfer: number }
      >();

      for (const row of paidSums) {
        const accountId = row.accountId;
        const type = row.type as TransactionType;
        const amount = this.toNumber(row._sum?.amount);

        const current = paidByAccount.get(accountId) ?? {
          income: 0,
          expense: 0,
          transfer: 0,
        };

        if (type === TransactionType.INCOME) current.income += Math.abs(amount);
        else if (type === TransactionType.EXPENSE)
          current.expense += Math.abs(amount);
        else if (type === TransactionType.TRANSFER) current.transfer += amount;

        paidByAccount.set(accountId, current);
      }

      const unpaidCreditExpenses = creditAccountIds.length
        ? await this.prisma.transaction.groupBy({
            by: ["accountId"],
            where: {
              accountId: { in: creditAccountIds },
              type: TransactionType.EXPENSE,
              isPaid: false,
            },
            _sum: { amount: true },
          })
        : [];

      const unpaidByCreditAccount = new Map<string, number>();
      for (const row of unpaidCreditExpenses) {
        unpaidByCreditAccount.set(
          row.accountId,
          Math.abs(this.toNumber(row._sum?.amount)),
        );
      }

      return accounts.map((a) => ({
        id: a.id,
        name: a.name,
        color: a.color,
        icon: a.icon,
        type: a.type,
        ownerId: a.ownerId,
        creditCardInfo: a.creditCardInfo
          ? (() => {
              const limit = a.creditCardInfo?.limit
                ? this.toNumber(a.creditCardInfo.limit)
                : null;
              const used = unpaidByCreditAccount.get(a.id) ?? 0;
              const availableLimit =
                typeof limit === "number" && Number.isFinite(limit)
                  ? Math.max(0, limit - used)
                  : null;

              return {
                ...a.creditCardInfo,
                limit,
                availableLimit,
              };
            })()
          : null,
        balance:
          a.type === AccountType.STANDARD
            ? (() => {
                const initialBalance = this.toNumber(a.initialBalance);
                const sums = paidByAccount.get(a.id) ?? {
                  income: 0,
                  expense: 0,
                  transfer: 0,
                };
                return (
                  initialBalance + sums.income - sums.expense + sums.transfer
                );
              })()
            : 0,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.handleFindAccountsError(error);
    }
  }

  /**
   * Atualiza uma conta existente
   * @async
   * @param {string} userId - ID do usuário realizando a atualização
   * @param {string} accountId - ID da conta a ser atualizada
   * @param {UpdateAccountDTO} data - Novos dados da conta
   * @returns {Promise<AccountDTO>} Dados atualizados da conta
   * @throws {AccountNotFoundError} Caso a conta não exista
   * @throws {PermissionDeniedError} Caso o usuário não tenha permissão de escrita
   * @throws {AccountValidationError} Caso campos de cartão sejam enviados para conta padrão
   */
  async update(
    userId: string,
    accountId: string,
    data: UpdateAccountDTO,
  ): Promise<AccountDTO> {
    try {
      await this.assertCanWriteAccount(userId, accountId);

      const existing = await this.prisma.account.findUnique({
        where: { id: accountId },
        include: { creditCardInfo: true },
      });

      if (!existing) throw new AccountNotFoundError(accountId);

      const hasCreditFields =
        data.closingDay !== undefined ||
        data.dueDay !== undefined ||
        data.limit !== undefined ||
        data.brand !== undefined;

      if (existing.type !== AccountType.CREDIT && hasCreditFields) {
        throw new AccountValidationError(
          "Campos de cartão só podem ser atualizados em contas do tipo crédito",
        );
      }

      const updateData: Prisma.AccountUpdateInput = {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
      };

      if (existing.type === AccountType.CREDIT && hasCreditFields) {
        const closingDay =
          typeof data.closingDay === "number"
            ? data.closingDay
            : existing.creditCardInfo?.closingDay;
        const dueDay =
          typeof data.dueDay === "number"
            ? data.dueDay
            : existing.creditCardInfo?.dueDay;

        if (typeof closingDay !== "number" || typeof dueDay !== "number") {
          throw new AccountValidationError(
            "Dia de fechamento e vencimento são obrigatórios para cartões de crédito",
          );
        }

        updateData.creditCardInfo = {
          upsert: {
            create: {
              closingDay,
              dueDay,
              ...(data.limit !== undefined ? { limit: data.limit } : {}),
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
            },
            update: {
              ...(data.closingDay !== undefined
                ? { closingDay: data.closingDay }
                : {}),
              ...(data.dueDay !== undefined ? { dueDay: data.dueDay } : {}),
              ...(data.limit !== undefined ? { limit: data.limit } : {}),
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
            },
          },
        };
      }

      await this.prisma.account.update({
        where: { id: accountId },
        data: updateData,
      });

      return this.getAccountDTO(userId, accountId);
    } catch (error) {
      return this.handleUpdateAccountError(error, data.name);
    }
  }

  /**
   * Trata erros de atualização de conta.
   * @private
   * @param {unknown} error - Erro capturado.
   * @param {string} [accountName] - Nome da conta para contexto.
   * @throws {DuplicateAccountError} Caso o novo nome já exista.
   * @throws {AccountValidationError} Caso os dados sejam inválidos.
   * @throws {DatabaseConnectionError} Caso haja erro de conexão.
   * @throws {AccountOperationError} Para outros erros inesperados.
   */
  private handleUpdateAccountError(
    error: unknown,
    accountName?: string,
  ): never {
    if (error instanceof AccountError) {
      throw error;
    }

    if (error instanceof Error) {
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        throw new DuplicateAccountError(accountName ?? "");
      }

      if (
        error.message.includes("Argument") ||
        error.message.includes("Invalid")
      ) {
        throw new AccountValidationError(
          "Dados inválidos fornecidos para atualização da conta",
        );
      }

      if (
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        throw new DatabaseConnectionError(error);
      }
    }

    throw new AccountOperationError(
      "atualizar",
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * Trata erros de criação de conta.
   * @private
   * @param {unknown} error - Erro capturado.
   * @param {string} accountName - Nome da conta para contexto.
   * @throws {DuplicateAccountError} Caso o nome já exista.
   * @throws {UserNotFoundError} Caso o usuário não seja encontrado.
   * @throws {AccountValidationError} Caso os dados sejam inválidos.
   * @throws {DatabaseConnectionError} Caso haja erro de conexão.
   * @throws {AccountOperationError} Para outros erros inesperados.
   */
  private handleCreateAccountError(error: unknown, accountName: string): never {
    if (error instanceof AccountError) {
      throw error;
    }

    if (error instanceof Error) {
      // Erro de constraint unique (nome duplicado)
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        throw new DuplicateAccountError(accountName);
      }

      // Erro de foreign key (usuário não existe)
      if (
        error.message.includes("Foreign key constraint") ||
        error.message.includes("violates foreign key")
      ) {
        throw new UserNotFoundError("");
      }

      // Erro de validação do Prisma
      if (
        error.message.includes("Argument") ||
        error.message.includes("Invalid")
      ) {
        throw new AccountValidationError(
          "Dados inválidos fornecidos para criação da conta",
        );
      }

      // Erro de conexão
      if (
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        throw new DatabaseConnectionError(error);
      }
    }

    throw new AccountOperationError(
      "criar",
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * Trata erros de busca de contas.
   * @private
   * @param {unknown} error - Erro capturado.
   * @throws {DatabaseConnectionError} Caso haja erro de conexão.
   * @throws {PermissionDeniedError} Caso o usuário não tenha permissão.
   * @throws {AccountOperationError} Para outros erros inesperados.
   */
  private handleFindAccountsError(error: unknown): never {
    if (error instanceof AccountError) {
      throw error;
    }

    if (error instanceof Error) {
      // Erro de conexão com banco
      if (
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        throw new DatabaseConnectionError(error);
      }

      // Erro de permissão
      if (
        error.message.includes("permission") ||
        error.message.includes("denied")
      ) {
        throw new PermissionDeniedError("acessar");
      }
    }

    throw new AccountOperationError(
      "buscar",
      error instanceof Error ? error : undefined,
    );
  }
}
