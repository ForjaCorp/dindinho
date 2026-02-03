import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { TransactionsService } from "./transactions.service";
import {
  createTransactionSchema,
  updateTransactionQuerySchema,
  UpdateTransactionQueryDTO,
  UpdateTransactionScopeDTO,
  deleteTransactionQuerySchema,
  DeleteTransactionQueryDTO,
  DeleteTransactionScopeDTO,
  listTransactionsQuerySchema,
  paginatedTransactionsSchema,
  transactionSchema,
  transferSchema,
  updateTransactionSchema,
  UpdateTransactionDTO,
  apiErrorResponseSchema,
} from "@dindinho/shared";
import { getHttpErrorLabel } from "../lib/get-http-error-label";
import { ForbiddenError, NotFoundError } from "../lib/domain-exceptions";

export async function transactionsRoutes(app: FastifyInstance) {
  const service = new TransactionsService(prisma);

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const normalizeQuery = (value: unknown): Record<string, unknown> => {
    if (value instanceof URLSearchParams) {
      const result: Record<string, unknown> = {};
      value.forEach((val, key) => {
        const current = result[key];
        if (current === undefined) {
          result[key] = val;
        } else if (Array.isArray(current)) {
          (current as unknown[]).push(val);
        } else {
          result[key] = [current, val];
        }
      });
      return result;
    }
    if (!isRecord(value)) return {};
    return value;
  };

  const parseQueryFromUrl = (
    url: string | undefined,
  ): Record<string, unknown> => {
    if (!url) return {};
    const parsedUrl = new URL(url, "http://localhost");
    const result: Record<string, unknown> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      const current = result[key];
      if (current === undefined) {
        result[key] = val;
      } else if (Array.isArray(current)) {
        (current as unknown[]).push(val);
      } else {
        result[key] = [current, val];
      }
    });
    return result;
  };

  const paramsSchema = z.object({
    id: z.string().uuid(),
  });

  app.addHook("onRequest", app.authenticate);

  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar transação",
        tags: ["transactions"],
        body: createTransactionSchema,
        response: {
          201: z.union([
            transactionSchema,
            z.array(transactionSchema),
            transferSchema,
          ]),
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const transactionData = createTransactionSchema.parse(request.body);
        const result = await service.create(userId, transactionData);
        return reply.code(201).send(result);
      } catch (error: unknown) {
        if (error instanceof NotFoundError) {
          const statusCode = 404;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: "NOT_FOUND",
          });
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2003"
        ) {
          const statusCode = 404;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: "Categoria não encontrada.",
            code: "CATEGORY_NOT_FOUND",
          });
        }

        if (error instanceof ForbiddenError) {
          const statusCode = 403;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: "FORBIDDEN",
          });
        }

        request.log.error({ err: error }, "Erro ao criar transação");
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
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
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const queryFromRequest = normalizeQuery(request.query);
        const queryFromUrl = parseQueryFromUrl(request.raw.url ?? request.url);
        const mergedQuery = { ...queryFromRequest, ...queryFromUrl };

        const monthFallback =
          typeof mergedQuery.month === "string" ? mergedQuery.month : undefined;

        const normalizedMergedQuery =
          typeof mergedQuery.invoiceMonth !== "string" &&
          typeof monthFallback === "string" &&
          /^\d{4}-\d{2}$/.test(monthFallback)
            ? { ...mergedQuery, invoiceMonth: monthFallback }
            : mergedQuery;

        const parsed = listTransactionsQuerySchema.parse(normalizedMergedQuery);
        const categoryIdFallback =
          typeof mergedQuery.categoryId === "string"
            ? mergedQuery.categoryId
            : typeof mergedQuery.categoryid === "string"
              ? mergedQuery.categoryid
              : undefined;
        const normalizedQuery = categoryIdFallback
          ? { ...parsed, categoryId: categoryIdFallback }
          : parsed;
        return await service.list(userId, normalizedQuery);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          const { statusCode } = error;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: error.constructor.name.replace(/Error$/, "").toUpperCase(),
          });
        }

        request.log.error({ err: error }, "Erro ao listar transações");
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
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
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const { id } = paramsSchema.parse(request.params);
        return await service.getById(userId, id);
      } catch (error) {
        if (error instanceof ForbiddenError || error instanceof NotFoundError) {
          const { statusCode } = error;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: error.constructor.name.replace(/Error$/, "").toUpperCase(),
          });
        }

        request.log.error({ err: error }, "Erro ao obter transação");
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
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
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const { id } = paramsSchema.parse(request.params);
        const query: UpdateTransactionQueryDTO =
          updateTransactionQuerySchema.parse(request.query);
        const scope: UpdateTransactionScopeDTO = query.scope ?? "ONE";
        const payload: UpdateTransactionDTO = updateTransactionSchema.parse(
          request.body,
        );
        return await service.update(userId, id, payload, scope);
      } catch (error) {
        if (error instanceof ForbiddenError || error instanceof NotFoundError) {
          const { statusCode } = error;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: error.constructor.name.replace(/Error$/, "").toUpperCase(),
          });
        }

        request.log.error({ err: error }, "Erro ao atualizar transação");
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
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
          200: z.object({
            deletedIds: z.array(z.string().uuid()),
          }),
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const { id } = paramsSchema.parse(request.params);
        const query: DeleteTransactionQueryDTO =
          deleteTransactionQuerySchema.parse(request.query);
        const scope: DeleteTransactionScopeDTO = query.scope ?? "ONE";
        const { deletedIds } = await service.delete(userId, id, scope);
        return reply.code(200).send({ deletedIds });
      } catch (error) {
        if (error instanceof ForbiddenError || error instanceof NotFoundError) {
          const { statusCode } = error;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: error.constructor.name.replace(/Error$/, "").toUpperCase(),
          });
        }

        request.log.error({ err: error }, "Erro ao excluir transação");
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );
}
