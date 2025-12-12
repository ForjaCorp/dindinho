import { PrismaClient, WalletType } from "@prisma/client";
import { CreateWalletDTO } from "@dindinho/shared";

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
      // Tratamento específico para diferentes tipos de erro
      if (error instanceof Error) {
        // Erro de constraint unique (nome duplicado para o mesmo usuário)
        if (error.message.includes("Unique constraint")) {
          const err = new Error(
            "Já existe uma carteira com este nome para este usuário",
          );
          (err as any).statusCode = 409;
          throw err;
        }
        // Erro de foreign key (usuário não existe)
        if (error.message.includes("Foreign key constraint")) {
          const err = new Error("Usuário não encontrado");
          (err as any).statusCode = 404;
          throw err;
        }
        // Erro de validação do Prisma
        if (error.message.includes("Argument")) {
          const err = new Error(
            "Dados inválidos fornecidos para criação da carteira",
          );
          (err as any).statusCode = 400;
          throw err;
        }
      }

      // Erro genérico
      throw new Error("Erro ao criar carteira. Tente novamente mais tarde.");
    }
  }

  /**
   * Lista todas as carteiras de um usuário.
   *
   * @param userId - ID do usuário para buscar as carteiras
   * @returns Array de carteiras do usuário ordenadas por data de criação
   *
   * @example
   * const wallets = await service.findAllByUserId('user-123');
   * console.log(wallets.length); // Número de carteiras do usuário
   */
  async findAllByUserId(userId: string) {
    try {
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
      // Tratamento específico para diferentes tipos de erro
      if (error instanceof Error) {
        // Erro de conexão com banco
        if (error.message.includes("connection")) {
          const err = new Error("Erro de conexão com o banco de dados");
          (err as any).statusCode = 503;
          throw err;
        }
        // Erro de permissão
        if (error.message.includes("permission")) {
          const err = new Error("Sem permissão para acessar as carteiras");
          (err as any).statusCode = 403;
          throw err;
        }
      }

      // Erro genérico
      throw new Error("Erro ao buscar carteiras. Tente novamente mais tarde.");
    }
  }
}
