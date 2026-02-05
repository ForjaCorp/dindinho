import { prisma } from "../lib/prisma";
import { CreateCategoryDTO } from "@dindinho/shared";
import { ForbiddenError, NotFoundError } from "../lib/domain-exceptions";

/**
 * Categorias globais padrão criadas para todos os novos usuários.
 */
const defaultGlobalCategories = [
  { name: "Salário", icon: "pi-briefcase" },
  { name: "Investimento", icon: "pi-chart-line" },
  { name: "Outros Rendimentos", icon: "pi-wallet" },
  { name: "Moradia", icon: "pi-home" },
  { name: "Transporte", icon: "pi-car" },
  { name: "Saúde", icon: "pi-heart" },
  { name: "Educação", icon: "pi-book" },
  { name: "Compras", icon: "pi-shopping-cart" },
  { name: "Lazer", icon: "pi-ticket" },
  { name: "Pessoal", icon: "pi-user" },
  { name: "Outros", icon: "pi-tag" },
];

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
   * Garante que as categorias globais padrão existam no banco de dados.
   * @private
   * @async
   */
  private async ensureDefaultGlobalCategories() {
    const globalCount = await this.prismaClient.category.count({
      where: { userId: null },
    });
    if (globalCount >= defaultGlobalCategories.length) return;

    const existing = await this.prismaClient.category.findMany({
      where: { userId: null },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((c) => c.name));

    for (const cat of defaultGlobalCategories) {
      if (existingNames.has(cat.name)) continue;
      await this.prismaClient.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          userId: null,
          parentId: null,
        },
      });
    }
  }

  /**
   * Lista todas as categorias disponíveis para o usuário (pessoais + globais).
   * @async
   * @param {string} userId - ID do usuário.
   * @returns {Promise<Array>} Lista de categorias ordenadas por nome.
   */
  async findAllByUserId(userId: string) {
    await this.ensureDefaultGlobalCategories();

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
