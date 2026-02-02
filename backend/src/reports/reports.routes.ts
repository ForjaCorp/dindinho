import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ReportsService } from "./reports.service";
import {
  reportFilterSchema,
  spendingByCategorySchema,
  cashFlowSchema,
  balanceHistorySchema,
  apiErrorResponseSchema,
} from "@dindinho/shared";

export async function reportsRoutes(app: FastifyInstance) {
  const service = new ReportsService(prisma);

  app.addHook("onRequest", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw {
        statusCode: 401,
        message: "Token inválido ou expirado",
        code: "INVALID_TOKEN",
      };
    }
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    "/reports/spending-by-category",
    {
      schema: {
        summary: "Relatório de gastos por categoria",
        tags: ["reports"],
        querystring: reportFilterSchema,
        response: {
          200: spendingByCategorySchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = request.user.sub;
      return service.getSpendingByCategory(userId, request.query);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/reports/cash-flow",
    {
      schema: {
        summary: "Relatório de fluxo de caixa mensal",
        tags: ["reports"],
        querystring: reportFilterSchema,
        response: {
          200: cashFlowSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = request.user.sub;
      return service.getCashFlow(userId, request.query);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/reports/balance-history",
    {
      schema: {
        summary: "Relatório de histórico de saldo",
        tags: ["reports"],
        querystring: reportFilterSchema,
        response: {
          200: balanceHistorySchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = request.user.sub;
      return service.getBalanceHistory(userId, request.query);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/reports/export/csv",
    {
      schema: {
        summary: "Exportar transações filtradas para CSV",
        tags: ["reports"],
        querystring: reportFilterSchema,
        response: {
          200: z.string(),
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const csv = await service.exportTransactionsCsv(userId, request.query);

      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename=transacoes-${new Date().toISOString().split("T")[0]}.csv`,
        )
        .send(csv);
    },
  );
}
