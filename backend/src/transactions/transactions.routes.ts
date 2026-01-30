import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TransactionsService } from "./transactions.service";
import {
  CreateTransactionDTO,
  createTransactionSchema,
  updateTransactionQuerySchema,
  UpdateTransactionQueryDTO,
  UpdateTransactionScopeDTO,
  deleteTransactionQuerySchema,
  deleteTransactionResponseSchema,
  DeleteTransactionQueryDTO,
  DeleteTransactionScopeDTO,
  listTransactionsQuerySchema,
  paginatedTransactionsSchema,
  transactionSchema,
  updateTransactionSchema,
  UpdateTransactionDTO,
} from "@dindinho/shared";

export async function transactionsRoutes(app: FastifyInstance) {
  const service = new TransactionsService(prisma);

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const normalizeQuery = (value: unknown): Record<string, unknown> => {
    if (value instanceof URLSearchParams) {
      return Object.fromEntries(value.entries());
    }
    if (!isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        const normalized = Array.isArray(entry) ? entry[0] : entry;
        if (normalized === undefined) return [];
        return [[key, normalized]];
      }),
    );
  };

  const parseQueryFromUrl = (
    url: string | undefined,
  ): Record<string, string> => {
    if (!url) return {};
    const parsedUrl = new URL(url, "http://localhost");
    return Object.fromEntries(parsedUrl.searchParams.entries());
  };

  const paramsSchema = z.object({
    id: z.string().uuid(),
  });

  app.addHook("onRequest", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw { statusCode: 401, message: "Token inválido ou expirado" };
    }
  });

  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar transação",
        tags: ["transactions"],
        body: createTransactionSchema,
        response: {
          201: z.union([transactionSchema, z.array(transactionSchema)]),
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = request.user as { sub: string };
      const payload: CreateTransactionDTO = createTransactionSchema.parse(
        request.body,
      );
      const result = await service.create(userId, payload);
      return reply.status(201).send(result);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        summary: "Listar transações por conta",
        tags: ["transactions"],
        querystring: listTransactionsQuerySchema,
        response: {
          200: paginatedTransactionsSchema,
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user as { sub: string };
      const queryFromRequest = normalizeQuery(request.query);
      const queryFromUrl = parseQueryFromUrl(request.raw.url ?? request.url);
      const mergedQuery = { ...queryFromRequest, ...queryFromUrl };
      const parsed = listTransactionsQuerySchema.parse(mergedQuery);
      const categoryIdFallback =
        typeof mergedQuery.categoryId === "string"
          ? mergedQuery.categoryId
          : typeof mergedQuery.categoryid === "string"
            ? mergedQuery.categoryid
            : undefined;
      const normalizedQuery = categoryIdFallback
        ? { ...parsed, categoryId: categoryIdFallback }
        : parsed;
      return service.list(userId, normalizedQuery);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/:id",
    {
      schema: {
        summary: "Obter transação",
        tags: ["transactions"],
        params: paramsSchema,
        response: {
          200: transactionSchema,
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user as { sub: string };
      const { id } = paramsSchema.parse(request.params);
      return service.getById(userId, id);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().patch(
    "/:id",
    {
      schema: {
        summary: "Atualizar transação",
        tags: ["transactions"],
        params: paramsSchema,
        querystring: updateTransactionQuerySchema,
        body: updateTransactionSchema,
        response: {
          200: transactionSchema,
          400: z.object({ message: z.string() }).passthrough(),
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user as { sub: string };
      const { id } = paramsSchema.parse(request.params);
      const query: UpdateTransactionQueryDTO =
        updateTransactionQuerySchema.parse(request.query);
      const scope: UpdateTransactionScopeDTO = query.scope ?? "ONE";
      const payload: UpdateTransactionDTO = updateTransactionSchema.parse(
        request.body,
      );
      return service.update(userId, id, payload, scope);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().delete(
    "/:id",
    {
      schema: {
        summary: "Excluir transação",
        tags: ["transactions"],
        params: paramsSchema,
        querystring: deleteTransactionQuerySchema,
        response: {
          200: deleteTransactionResponseSchema,
          401: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user as { sub: string };
      const { id } = paramsSchema.parse(request.params);
      const query: DeleteTransactionQueryDTO =
        deleteTransactionQuerySchema.parse(request.query);
      const scope: DeleteTransactionScopeDTO = query.scope ?? "ONE";
      return service.delete(userId, id, scope);
    },
  );
}
