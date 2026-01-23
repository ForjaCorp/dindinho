import { PrismaClient, TransactionType, AccountType } from "@prisma/client";
import { AccountDTO, CreateAccountDTO } from "@dindinho/shared";

/**
 * Erro base para operações de conta
 * @description Classe base para todos os erros relacionados a contas
 */
abstract class AccountError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro quando conta com nome duplicado já existe
 * @description Lançado quando usuário tenta criar conta com nome já existente
 */
class DuplicateAccountError extends AccountError {
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
 * Erro quando usuário não é encontrado
 * @description Lançado quando userId fornecido não existe no sistema
 */
class UserNotFoundError extends AccountError {
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
 * Erro de validação de dados
 * @description Lançado quando dados fornecidos são inválidos
 */
class AccountValidationError extends AccountError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, validationErrors?: any) {
    super(`Dados inválidos: ${message}`, {
      validationErrors,
      code: "VALIDATION_ERROR",
    });
  }
}

/**
 * Erro de conexão com banco de dados
 * @description Lançado quando há problemas de conexão com o banco
 */
class DatabaseConnectionError extends AccountError {
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
 * Erro de permissão
 * @description Lançado quando usuário não tem permissão para acessar recurso
 */
class PermissionDeniedError extends AccountError {
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
 * Erro genérico de conta
 * @description Erro não esperado em operações de conta
 */
class AccountOperationError extends AccountError {
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
 * Serviço responsável pelo gerenciamento de contas dos usuários.
 *
 * @description
 * Fornece operações CRUD para contas, incluindo criação de contas padrão
 * e cartões de crédito com informações específicas.
 *
 * @example
 * const service = new AccountsService(prisma);
 * const account = await service.create('user-123', {
 *   name: 'Cartão Nubank',
 *   color: '#8A2BE2',
 *   icon: 'pi-credit-card',
 *   type: 'CREDIT',
 *   closingDay: 10,
 *   dueDay: 15,
 *   limit: 5000
 * });
 */
export class AccountsService {
  /**
   * Instância do PrismaClient para acesso ao banco de dados.
   */
  constructor(private prisma: PrismaClient) {}

  private toNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      value &&
      typeof value === "object" &&
      "toNumber" in value &&
      typeof (value as any).toNumber === "function"
    ) {
      const n = (value as any).toNumber();
      return typeof n === "number" && Number.isFinite(n) ? n : 0;
    }
    return 0;
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

      const account = await (this.prisma as any).account.create({
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
   * console.log(accounts.length); // Número de contas do usuário
   */
  async findAllByUserId(userId: string): Promise<AccountDTO[]> {
    try {
      const accounts = (await (this.prisma as any).account.findMany({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      })) as any[];

      if (!accounts.length) return [];

      const accountIds = accounts.map((a: any) => a.id);
      const creditAccountIds = accounts
        .filter((w: any) => w.type === AccountType.CREDIT)
        .map((w: any) => w.id);

      const paidSums = await (this.prisma as any).transaction.groupBy({
        by: ["accountId", "type"],
        where: {
          accountId: { in: accountIds },
          isPaid: true,
        },
        _sum: {
          amount: true,
        },
      } as any);

      const paidByAccount = new Map<
        string,
        { income: number; expense: number; transfer: number }
      >();

      for (const row of paidSums as any[]) {
        const accountId = row.accountId as string;
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
        ? await (this.prisma as any).transaction.groupBy({
            by: ["accountId"],
            where: {
              accountId: { in: creditAccountIds },
              type: TransactionType.EXPENSE,
              isPaid: false,
            },
            _sum: { amount: true },
          } as any)
        : [];

      const unpaidByCreditAccount = new Map<string, number>();
      for (const row of unpaidCreditExpenses as any[]) {
        unpaidByCreditAccount.set(
          row.accountId as string,
          Math.abs(this.toNumber(row._sum?.amount)),
        );
      }

      return accounts.map((a: any) => ({
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
                const initialBalance = this.toNumber((a as any).initialBalance);
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
   * Trata erros de criação de conta
   * @param error - Erro capturado
   * @param accountName - Nome da conta para contexto
   * @private
   */
  private handleCreateAccountError(error: any, accountName: string): never {
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
   * Trata erros de busca de contas
   * @param error - Erro capturado
   * @private
   */
  private handleFindAccountsError(error: any): never {
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
