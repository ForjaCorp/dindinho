import { PrismaClient, TransactionType, WalletType } from "@prisma/client";
import { CreateWalletDTO, WalletDTO } from "@dindinho/shared";

/**
 * Erro base para operações de conta
 * @description Classe base para todos os erros relacionados a contas
 */
abstract class WalletError extends Error {
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
class DuplicateWalletError extends WalletError {
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(walletName: string) {
    super(`Já existe uma conta com nome "${walletName}" para este usuário`, {
      walletName,
      code: "DUPLICATE_WALLET_NAME",
    });
  }
}

/**
 * Erro quando usuário não é encontrado
 * @description Lançado quando userId fornecido não existe no sistema
 */
class UserNotFoundError extends WalletError {
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
class WalletValidationError extends WalletError {
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
class DatabaseConnectionError extends WalletError {
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
class PermissionDeniedError extends WalletError {
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
class WalletOperationError extends WalletError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(operation: string, originalError?: Error) {
    super(`Erro inesperado ao ${operation} conta`, {
      operation,
      originalError: originalError?.message,
      code: "WALLET_OPERATION_ERROR",
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
 * const service = new WalletsService(prisma);
 * const wallet = await service.create('user-123', {
 *   name: 'Cartão Nubank',
 *   color: '#8A2BE2',
 *   icon: 'pi-credit-card',
 *   type: 'CREDIT',
 *   closingDay: 10,
 *   dueDay: 15,
 *   limit: 5000
 * });
 */
export class WalletsService {
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
   * @throws {DuplicateWalletError} Quando já existe conta com mesmo nome
   * @throws {UserNotFoundError} Quando usuário não é encontrado
   * @throws {WalletValidationError} Quando dados são inválidos
   * @throws {WalletOperationError} Quando ocorre erro inesperado
   *
   * @example
   * const wallet = await service.create('user-123', {
   *   name: 'Minha Conta',
   *   color: '#FF5722',
   *   icon: 'pi-wallet',
   *   type: 'STANDARD'
   * });
   */
  async create(userId: string, data: CreateWalletDTO): Promise<WalletDTO> {
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

      const wallet = await this.prisma.wallet.create({
        data: {
          name: data.name,
          color: data.color,
          icon: data.icon,
          type: data.type as WalletType,
          ownerId: userId,
          initialBalance,
          creditCardInfo: creditCardData,
        },
        include: {
          creditCardInfo: true,
        },
      });

      const limit = wallet.creditCardInfo?.limit
        ? this.toNumber(wallet.creditCardInfo.limit)
        : null;

      return {
        id: wallet.id,
        name: wallet.name,
        color: wallet.color,
        icon: wallet.icon,
        type: wallet.type,
        ownerId: wallet.ownerId,
        creditCardInfo: wallet.creditCardInfo
          ? {
              ...wallet.creditCardInfo,
              limit,
              availableLimit: limit,
            }
          : null,
        balance: wallet.type === WalletType.STANDARD ? initialBalance : 0,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      };
    } catch (error) {
      return this.handleCreateWalletError(error, data.name);
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
   * @throws {WalletOperationError} Quando ocorre erro inesperado
   *
   * @example
   * const wallets = await service.findAllByUserId('user-123');
   * console.log(wallets.length); // Número de contas do usuário
   */
  async findAllByUserId(userId: string): Promise<WalletDTO[]> {
    try {
      const wallets = await this.prisma.wallet.findMany({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      });

      if (!wallets.length) return [];

      const walletIds = wallets.map((w) => w.id);
      const creditWalletIds = wallets
        .filter((w) => w.type === WalletType.CREDIT)
        .map((w) => w.id);

      const paidSums = await this.prisma.transaction.groupBy({
        by: ["walletId", "type"],
        where: {
          walletId: { in: walletIds },
          isPaid: true,
        },
        _sum: {
          amount: true,
        },
      });

      const paidByWallet = new Map<
        string,
        { income: number; expense: number; transfer: number }
      >();

      for (const row of paidSums as any[]) {
        const walletId = row.walletId as string;
        const type = row.type as TransactionType;
        const amount = this.toNumber(row._sum?.amount);

        const current = paidByWallet.get(walletId) ?? {
          income: 0,
          expense: 0,
          transfer: 0,
        };

        if (type === TransactionType.INCOME) current.income += Math.abs(amount);
        else if (type === TransactionType.EXPENSE)
          current.expense += Math.abs(amount);
        else if (type === TransactionType.TRANSFER) current.transfer += amount;

        paidByWallet.set(walletId, current);
      }

      const unpaidCreditExpenses = creditWalletIds.length
        ? await this.prisma.transaction.groupBy({
            by: ["walletId"],
            where: {
              walletId: { in: creditWalletIds },
              type: TransactionType.EXPENSE,
              isPaid: false,
            },
            _sum: { amount: true },
          })
        : [];

      const unpaidByCreditWallet = new Map<string, number>();
      for (const row of unpaidCreditExpenses as any[]) {
        unpaidByCreditWallet.set(
          row.walletId as string,
          Math.abs(this.toNumber(row._sum?.amount)),
        );
      }

      return wallets.map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color,
        icon: w.icon,
        type: w.type,
        ownerId: w.ownerId,
        creditCardInfo: w.creditCardInfo
          ? (() => {
              const limit = w.creditCardInfo?.limit
                ? this.toNumber(w.creditCardInfo.limit)
                : null;
              const used = unpaidByCreditWallet.get(w.id) ?? 0;
              const availableLimit =
                typeof limit === "number" && Number.isFinite(limit)
                  ? Math.max(0, limit - used)
                  : null;

              return {
                ...w.creditCardInfo,
                limit,
                availableLimit,
              };
            })()
          : null,
        balance:
          w.type === WalletType.STANDARD
            ? (() => {
                const initialBalance = this.toNumber((w as any).initialBalance);
                const sums = paidByWallet.get(w.id) ?? {
                  income: 0,
                  expense: 0,
                  transfer: 0,
                };
                return (
                  initialBalance + sums.income - sums.expense + sums.transfer
                );
              })()
            : 0,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.handleFindWalletsError(error);
    }
  }

  /**
   * Trata erros de criação de conta
   * @param error - Erro capturado
   * @param walletName - Nome da conta para contexto
   * @private
   */
  private handleCreateWalletError(error: any, walletName: string): never {
    if (error instanceof WalletError) {
      throw error;
    }

    if (error instanceof Error) {
      // Erro de constraint unique (nome duplicado)
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("duplicate key")
      ) {
        throw new DuplicateWalletError(walletName);
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
        throw new WalletValidationError(
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

    throw new WalletOperationError(
      "criar",
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * Trata erros de busca de contas
   * @param error - Erro capturado
   * @private
   */
  private handleFindWalletsError(error: any): never {
    if (error instanceof WalletError) {
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

    throw new WalletOperationError(
      "buscar",
      error instanceof Error ? error : undefined,
    );
  }
}
