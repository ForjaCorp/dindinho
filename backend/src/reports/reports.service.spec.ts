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
  dailySnapshot: {
    groupBy: vi.fn(),
  },
} as unknown as PrismaClient;

describe("ReportsService", () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe("getSpendingByCategory", () => {
    it("deve retornar gastos agrupados por categoria corretamente", async () => {
      const userId = "user-1";
      const filters = { includePending: true };

      vi.mocked(mockPrisma.transaction.groupBy).mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: 100 } },
        { categoryId: "cat-2", _sum: { amount: 300 } },
      ] as any);

      vi.mocked(mockPrisma.category.findMany).mockResolvedValue([
        { id: "cat-1", name: "Alimentação", icon: "pi-shopping-cart" },
        { id: "cat-2", name: "Lazer", icon: "pi-ticket" },
      ] as any);

      const result = await service.getSpendingByCategory(userId, filters);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        categoryId: "cat-2",
        categoryName: "Lazer",
        icon: "pi-ticket",
        amount: 300,
        percentage: 75,
      });
      expect(result[1]).toEqual({
        categoryId: "cat-1",
        categoryName: "Alimentação",
        icon: "pi-shopping-cart",
        amount: 100,
        percentage: 25,
      });
    });

    it("deve lidar com transações sem categoria", async () => {
      const userId = "user-1";
      vi.mocked(mockPrisma.transaction.groupBy).mockResolvedValue([
        { categoryId: null, _sum: { amount: 100 } },
      ] as any);
      vi.mocked(mockPrisma.category.findMany).mockResolvedValue([]);

      const result = await service.getSpendingByCategory(userId, {
        includePending: true,
      });

      expect(result[0]).toEqual(
        expect.objectContaining({
          categoryName: "Sem Categoria",
          amount: 100,
        }),
      );
    });

    it("deve aplicar filtros de data e contas", async () => {
      const userId = "user-1";
      const filters = {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-31T23:59:59Z",
        accountIds: ["acc-1"],
        includePending: true,
      };

      vi.mocked(mockPrisma.transaction.groupBy).mockResolvedValue([]);
      vi.mocked(mockPrisma.category.findMany).mockResolvedValue([]);

      await service.getSpendingByCategory(userId, filters);

      expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date(filters.startDate),
              lte: new Date(filters.endDate),
            },
            accountId: { in: ["acc-1"] },
          }),
        }),
      );
    });
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

  describe("getBalanceHistory", () => {
    it("deve retornar histórico de saldo corretamente", async () => {
      const userId = "user-1";
      const mockSnapshots = [
        { date: new Date("2024-01-01T00:00:00Z"), _sum: { balance: 1000 } },
        { date: new Date("2024-01-02T00:00:00Z"), _sum: { balance: 1100 } },
      ];

      vi.mocked(mockPrisma.dailySnapshot.groupBy).mockResolvedValue(
        mockSnapshots as any,
      );

      const result = await service.getBalanceHistory(userId, {
        includePending: true,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: "2024-01-01", balance: 1000 });
      expect(result[1]).toEqual({ date: "2024-01-02", balance: 1100 });
    });

    it("deve lidar com ausência de dados de saldo", async () => {
      vi.mocked(mockPrisma.dailySnapshot.groupBy).mockResolvedValue([]);
      const result = await service.getBalanceHistory("user-1", {
        includePending: true,
      });
      expect(result).toEqual([]);
    });
  });

  describe("exportTransactionsCsv", () => {
    it("deve gerar CSV com cabeçalho e transações corretamente", async () => {
      const userId = "user-1";
      const filters = { includePending: true };

      const mockTransactions = [
        {
          date: new Date("2024-01-01"),
          description: "Teste CSV, vírgula",
          amount: 100,
          type: TransactionType.EXPENSE,
          isPaid: true,
          category: { name: "Alimentação" },
          account: { name: "Carteira" },
        },
        {
          date: new Date("2024-01-02"),
          description: "Receita",
          amount: 500,
          type: TransactionType.INCOME,
          isPaid: false,
          category: null,
          account: { name: "Banco" },
        },
      ];

      vi.mocked(mockPrisma.transaction.findMany).mockResolvedValue(
        mockTransactions as any,
      );

      const result = await service.exportTransactionsCsv(userId, filters);

      const lines = result.split("\n");
      expect(lines[0]).toBe("Data,Descrição,Categoria,Conta,Tipo,Valor,Pago");
      expect(lines[1]).toBe(
        '2024-01-01,"Teste CSV, vírgula",Alimentação,Carteira,EXPENSE,100,Sim',
      );
      expect(lines[2]).toBe(
        "2024-01-02,Receita,Sem Categoria,Banco,INCOME,500,Não",
      );
    });
  });
});
