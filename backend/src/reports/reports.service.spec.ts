import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClient, TransactionType } from "@prisma/client";
import { ReportsService } from "./reports.service";

const mockPrisma = {
  transaction: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe("ReportsService", () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe("getCashFlow", () => {
    it("deve agrupar transações por invoiceMonth quando disponível", async () => {
      const userId = "user-1";
      const filters = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-03-31T23:59:59.999Z",
        includePending: true,
      };

      const mockTransactions = [
        {
          amount: 100,
          type: TransactionType.INCOME,
          date: new Date("2024-01-15"),
          invoiceMonth: null,
        },
        {
          amount: 50,
          type: TransactionType.EXPENSE,
          date: new Date("2024-01-25"),
          invoiceMonth: "2024-02", // Gasto em Jan, mas fatura em Fev
        },
        {
          amount: 200,
          type: TransactionType.EXPENSE,
          date: new Date("2024-02-10"),
          invoiceMonth: "2024-02",
        },
      ];

      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue(
        mockTransactions as unknown as never,
      );

      const result = await service.getCashFlow(userId, filters);

      // 2024-01: Apenas a receita de 100 (despesa de 50 foi para Fev via invoiceMonth)
      const jan = result.find((r) => r.period === "2024-01");
      expect(jan).toEqual(expect.objectContaining({ income: 100, expense: 0 }));

      // 2024-02: Despesa de 50 (de Jan) + Despesa de 200 (de Fev) = 250
      const feb = result.find((r) => r.period === "2024-02");
      expect(feb).toEqual(expect.objectContaining({ income: 0, expense: 250 }));
    });
  });
});
