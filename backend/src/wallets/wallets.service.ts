import { PrismaClient, WalletType } from "@prisma/client";
import { CreateWalletDTO } from "@dindinho/shared";

/**
 * Erro base para operações de carteira
 * @description Classe base para todos os erros relacionados a carteiras
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
 * Erro quando carteira com nome duplicado já existe
 * @description Lançado quando usuário tenta criar carteira com nome já existente
 */
class DuplicateWalletError extends WalletError {
  readonly statusCode = 409;
  readonly isOperational = true;

  constructor(walletName: string) {
    super(`Já existe uma carteira com nome "${walletName}" para este usuário`, {
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
    super(`Sem permissão para ${action} as carteiras`, {
      action,
      code: "PERMISSION_DENIED",
    });
  }
}

/**
 * Erro genérico de carteira
 * @description Erro não esperado em operações de carteira
 */
class WalletOperationError extends WalletError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(operation: string, originalError?: Error) {
    super(`Erro inesperado ao ${operation} carteira`, {
      operation,
      originalError: originalError?.message,
      code: "WALLET_OPERATION_ERROR",
    });
  }
}

/**
 * Serviço responsável pelo gerenciamento de carteiras dos usuários.
 *
 * @description
 * Fornece operações CRUD para carteiras, incluindo criação de carteiras padrão
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

  /**
   * Cria uma nova carteira para um usuário.
   *
   * @param userId - ID do usuário proprietário da carteira
   * @param data - Dados da carteira a ser criada
   * @returns Carteira criada com informações do cartão de crédito (se aplicável)
   *
   * @throws {DuplicateWalletError} Quando já existe carteira com mesmo nome
   * @throws {UserNotFoundError} Quando usuário não é encontrado
   * @throws {WalletValidationError} Quando dados são inválidos
   * @throws {WalletOperationError} Quando ocorre erro inesperado
   *
   * @example
   * const wallet = await service.create('user-123', {
   *   name: 'Minha Carteira',
   *   color: '#FF5722',
   *   icon: 'pi-wallet',
   *   type: 'STANDARD'
   * });
   */
  async create(userId: string, data: CreateWalletDTO) {
    try {
      // Validações adicionais
      this.validateCreateWalletData(userId, data);

      // Prepara os dados para criação
      // Se for CREDIT, configuramos a relação com CreditCardInfo
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

      const wallet = await this.prisma.wallet.create({
        data: {
          name: data.name,
          color: data.color,
          icon: data.icon,
          type: data.type as WalletType,
          ownerId: userId,
          creditCardInfo: creditCardData,
        },
        include: {
          creditCardInfo: true, // Retorna os dados do cartão criados
        },
      });

      return {
        ...wallet,
        // Converte Decimal do Prisma para number para compatibilidade com JSON/Zod
        creditCardInfo: wallet.creditCardInfo
          ? {
              ...wallet.creditCardInfo,
              limit: wallet.creditCardInfo.limit?.toNumber() ?? null,
            }
          : null,
        balance: 0, // Placeholder para o futuro
      };
    } catch (error) {
      this.handleCreateWalletError(error, data.name);
    }
  }

  /**
   * Lista todas as carteiras de um usuário.
   *
   * @param userId - ID do usuário para buscar as carteiras
   * @returns Array de carteiras do usuário ordenadas por data de criação
   *
   * @throws {DatabaseConnectionError} Quando há problemas de conexão
   * @throws {PermissionDeniedError} Quando usuário não tem permissão
   * @throws {WalletOperationError} Quando ocorre erro inesperado
   *
   * @example
   * const wallets = await service.findAllByUserId('user-123');
   * console.log(wallets.length); // Número de carteiras do usuário
   */
  async findAllByUserId(userId: string) {
    try {
      // Validação do userId
      this.validateUserId(userId);

      const wallets = await this.prisma.wallet.findMany({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      });

      return wallets.map((w) => ({
        ...w,
        creditCardInfo: w.creditCardInfo
          ? {
              ...w.creditCardInfo,
              limit: w.creditCardInfo.limit?.toNumber() ?? null,
            }
          : null,
        balance: 0, // Aqui entraremos com a soma das transações depois
      }));
    } catch (error) {
      this.handleFindWalletsError(error);
    }
  }

  /**
   * Valida dados para criação de carteira
   * @param userId - ID do usuário
   * @param data - Dados da carteira
   * @throws {WalletValidationError} Quando dados são inválidos
   * @private
   */
  private validateCreateWalletData(
    userId: string,
    data: CreateWalletDTO,
  ): void {
    if (!userId || userId.trim().length === 0) {
      throw new WalletValidationError("ID do usuário é obrigatório");
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new WalletValidationError("Nome da carteira é obrigatório");
    }

    if (data.name.length > 100) {
      throw new WalletValidationError(
        "Nome da carteira deve ter no máximo 100 caracteres",
      );
    }

    if (!data.color || !data.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new WalletValidationError(
        "Cor deve estar no formato hexadecimal (#RRGGBB)",
      );
    }

    if (!data.icon || data.icon.trim().length === 0) {
      throw new WalletValidationError("Ícone é obrigatório");
    }

    // Validações específicas para cartão de crédito
    if (data.type === "CREDIT") {
      if (!data.closingDay || data.closingDay < 1 || data.closingDay > 31) {
        throw new WalletValidationError(
          "Dia de fechamento deve estar entre 1 e 31",
        );
      }

      if (!data.dueDay || data.dueDay < 1 || data.dueDay > 31) {
        throw new WalletValidationError(
          "Dia de vencimento deve estar entre 1 e 31",
        );
      }

      if (data.limit !== undefined && data.limit <= 0) {
        throw new WalletValidationError("Limite deve ser positivo");
      }
    }
  }

  /**
   * Valida ID do usuário
   * @param userId - ID do usuário
   * @throws {WalletValidationError} Quando ID é inválido
   * @private
   */
  private validateUserId(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new WalletValidationError("ID do usuário é obrigatório");
    }
  }

  /**
   * Trata erros de criação de carteira
   * @param error - Erro capturado
   * @param walletName - Nome da carteira para contexto
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
          "Dados inválidos fornecidos para criação da carteira",
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
   * Trata erros de busca de carteiras
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
