import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  CategoryDTO,
  CreateCategoryDTO,
  categorySchema,
  createCategorySchema,
} from "@dindinho/shared";

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

const toCategoryDTO = (c: {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
  userId: string | null;
}): CategoryDTO => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  parentId: c.parentId,
  userId: c.userId,
});

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

async function ensureDefaultGlobalCategories() {
  const globalCount = await prisma.category.count({ where: { userId: null } });
  if (globalCount >= defaultGlobalCategories.length) return;

  const existing = await prisma.category.findMany({
    where: { userId: null },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((c) => c.name));

  for (const cat of defaultGlobalCategories) {
    if (existingNames.has(cat.name)) continue;
    await prisma.category.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        userId: null,
        parentId: null,
      },
      select: { id: true },
    });
  }
}

export async function categoriesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw { statusCode: 401, message: "Token inválido ou expirado" };
    }
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        summary: "Listar categorias",
        tags: ["categories"],
        response: {
          200: z.array(categorySchema),
          401: z.object({ message: z.string() }),
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user as { sub: string };

      await ensureDefaultGlobalCategories();

      const categories = await prisma.category.findMany({
        where: {
          OR: [{ userId }, { userId: null }],
        },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          icon: true,
          parentId: true,
          userId: true,
        },
      });

      return categories.map(toCategoryDTO);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar categoria",
        tags: ["categories"],
        body: createCategorySchema,
        response: {
          201: categorySchema,
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = request.user as { sub: string };
      const payload: CreateCategoryDTO = createCategorySchema.parse(
        request.body,
      );

      if (payload.parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: payload.parentId },
          select: { id: true, userId: true },
        });
        if (!parent) throw new NotFoundError("Categoria pai não encontrada");
        if (parent.userId !== null && parent.userId !== userId) {
          throw new ForbiddenError(
            "Sem permissão para usar esta categoria pai",
          );
        }
      }

      const created = await prisma.category.create({
        data: {
          name: payload.name,
          icon: payload.icon,
          parentId: payload.parentId ?? null,
          userId,
        },
        select: {
          id: true,
          name: true,
          icon: true,
          parentId: true,
          userId: true,
        },
      });

      return reply.status(201).send(toCategoryDTO(created));
    },
  );
}
