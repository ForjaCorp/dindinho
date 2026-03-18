import { prisma } from "../lib/prisma";
import { CreateCategoryDTO } from "@dindinho/shared";
import { ForbiddenError, NotFoundError } from "../lib/domain-exceptions";

/**
 * Serviço responsável pelo gerenciamento de categorias de transações.
 * @class CategoriesService
 * @description Gerencia a criação e listagem de categorias personalizadas e globais.
 */
export class CategoriesService {
  /**
   * @param {typeof prisma} prismaClient - Instância do cliente Prisma.
   */
  constructor(private readonly prismaClient: typeof prisma) {}

  /**
   * Lista todas as categorias disponíveis para o usuário (pessoais + globais).
   * @async
   * @param {string} userId - ID do usuário.
   * @returns {Promise<Array>} Lista de categorias ordenadas por nome.
   */
  async findAllByUserId(userId: string) {
    return this.prismaClient.category.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: [{ name: "asc" }],
    });
  }

  /**
   * Cria uma nova categoria personalizada para o usuário.
   * @async
   * @param {string} userId - ID do usuário.
   * @param {CreateCategoryDTO} payload - Dados da nova categoria.
   * @returns {Promise<Object>} Categoria criada.
   * @throws {NotFoundError} Caso a categoria pai informada não exista.
   * @throws {ForbiddenError} Caso o usuário não tenha permissão sobre a categoria pai.
   */
  async create(userId: string, payload: CreateCategoryDTO) {
    if (payload.parentId) {
      const parent = await this.prismaClient.category.findUnique({
        where: { id: payload.parentId },
        select: { id: true, userId: true },
      });
      if (!parent) throw new NotFoundError("Categoria pai não encontrada");
      if (parent.userId !== null && parent.userId !== userId) {
        throw new ForbiddenError("Sem permissão para usar esta categoria pai");
      }
    }

    return this.prismaClient.category.create({
      data: {
        name: payload.name,
        icon: payload.icon,
        parentId: payload.parentId ?? null,
        userId,
      },
    });
  }
}
