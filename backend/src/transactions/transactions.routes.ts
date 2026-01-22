import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TransactionsService } from "./transactions.service";
import {
  CreateTransactionDTO,
  createTransactionSchema,
  listTransactionsQuerySchema,
  paginatedTransactionsSchema,
  transactionSchema,
} from "@dindinho/shared";

export async function transactionsRoutes(app: FastifyInstance) {
  const service = new TransactionsService(prisma);

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
        summary: "Listar transações por carteira",
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
      const parsed = listTransactionsQuerySchema.parse(request.query);
      return service.list(userId, parsed);
    },
  );
}
