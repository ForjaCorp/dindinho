import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { ReportsService } from "./reports.service";
import {
  reportFilterSchema,
  spendingByCategorySchema,
  cashFlowSchema,
  balanceHistorySchema,
} from "@dindinho/shared";

export async function reportsRoutes(app: FastifyInstance) {
  const service = new ReportsService(prisma);

  app.addHook("onRequest", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw { statusCode: 401, message: "Token inválido ou expirado" };
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
        },
      },
    },
    async (request) => {
      const userId = request.user.sub;
      return service.getBalanceHistory(userId, request.query);
    },
  );
}
