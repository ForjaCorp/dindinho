import { prisma } from "../lib/prisma";
import { CreateCategoryDTO } from "@dindinho/shared";

class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = "Sem permissão") {
    super(message);
  }
}

class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Não encontrado") {
    super(message);
  }
}

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

export class CategoriesService {
  constructor(private readonly prismaClient: typeof prisma) {}

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

  async findAllByUserId(userId: string) {
    await this.ensureDefaultGlobalCategories();

    return this.prismaClient.category.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: [{ name: "asc" }],
    });
  }

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
