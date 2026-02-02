import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, Category, Transaction } from "@prisma/client";

// Mock profundo do Prisma
vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { buildApp } from "../app";
import { prisma } from "../lib/prisma";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("Rotas de Relatórios", () => {
  let app: ReturnType<typeof buildApp>;
  let token: string;

  const userId = "user-123";

  beforeEach(async () => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    mockReset(prismaMock);
    app = buildApp();
    await app.ready();
    token = app.jwt.sign({ sub: userId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/reports/spending-by-category", () => {
    it("deve retornar 200 e dados de gastos por categoria", async () => {
      const categoryId = "123e4567-e89b-12d3-a456-426614174001";
      vi.mocked(prismaMock.transaction.groupBy).mockResolvedValue([
        { categoryId, _sum: { amount: 100 } },
      ] as unknown as []);
      prismaMock.category.findMany.mockResolvedValue([
        { id: categoryId, name: "Alimentação", icon: "pi-tag" },
      ] as unknown as Category[]);

      const response = await app.inject({
        method: "GET",
        url: "/api/reports/spending-by-category",
        headers: { authorization: `Bearer ${token}` },
        query: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-31T23:59:59Z",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toBeInstanceOf(Array);
      expect(body[0]).toEqual(
        expect.objectContaining({
          categoryName: "Alimentação",
          amount: 100,
        }),
      );
    });

    it("deve aceitar accountIds como string única e normalizar para array", async () => {
      const categoryId = "123e4567-e89b-12d3-a456-426614174001";
      const accountId = "123e4567-e89b-12d3-a456-426614174000";

      vi.mocked(prismaMock.transaction.groupBy).mockResolvedValue([
        { categoryId, _sum: { amount: 50 } },
      ] as unknown as []);
      prismaMock.category.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/reports/spending-by-category",
        headers: { authorization: `Bearer ${token}` },
        query: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-31T23:59:59Z",
          accountIds: accountId, // Single string (simulating ?accountIds=...)
        },
      });

      expect(response.statusCode).toBe(200);

      // Verifica se o prisma foi chamado com array
      expect(prismaMock.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: { in: [accountId] },
          }),
        }),
      );
    });

    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reports/spending-by-category",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/reports/cash-flow", () => {
    it("deve retornar 200 e dados de fluxo de caixa", async () => {
      vi.mocked(prismaMock.transaction.findMany).mockResolvedValue([
        {
          amount: 100,
          type: "INCOME",
          date: new Date("2024-01-15"),
          invoiceMonth: null,
        },
        {
          amount: 50,
          type: "EXPENSE",
          date: new Date("2024-01-20"),
          invoiceMonth: null,
        },
      ] as unknown as Transaction[]);

      const response = await app.inject({
        method: "GET",
        url: "/api/reports/cash-flow",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0]).toEqual(
        expect.objectContaining({
          period: "2024-01",
          income: 100,
          expense: 50,
          balance: 50,
        }),
      );
    });
  });

  describe("GET /api/reports/balance-history", () => {
    it("deve retornar 200 e dados de histórico de saldo", async () => {
      prismaMock.account.findMany.mockResolvedValue([
        { id: "acc-1" },
      ] as unknown as []);

      vi.mocked(prismaMock.dailySnapshot.findFirst).mockResolvedValue(null);

      vi.mocked(prismaMock.dailySnapshot.aggregate).mockResolvedValue({
        _min: { date: new Date("2024-01-01T00:00:00Z") },
        _max: { date: new Date("2024-01-02T00:00:00Z") },
      } as unknown as never);

      vi.mocked(prismaMock.dailySnapshot.count).mockResolvedValue(2);

      vi.mocked(prismaMock.dailySnapshot.groupBy).mockResolvedValue([
        { date: new Date("2024-01-01"), _sum: { balance: 1000 } },
      ] as unknown as []);

      const response = await app.inject({
        method: "GET",
        url: "/api/reports/balance-history",
        headers: { authorization: `Bearer ${token}` },
        query: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-02T00:00:00Z",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].balance).toBe(1000);
    });
  });

  describe("GET /api/reports/export/csv", () => {
    it("deve retornar 200 e arquivo CSV", async () => {
      prismaMock.transaction.findMany.mockResolvedValue([
        {
          date: new Date("2024-01-01"),
          description: "Teste",
          amount: 100,
          type: "EXPENSE",
          isPaid: true,
          category: { name: "Food" },
          account: { name: "Wallet" },
        },
      ] as unknown as Transaction[]);

      const response = await app.inject({
        method: "GET",
        url: "/api/reports/export/csv",
        headers: { authorization: `Bearer ${token}` },
        query: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-31T23:59:59Z",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/csv");
      expect(response.headers["content-disposition"]).toContain(
        "attachment; filename=transacoes-",
      );
      expect(response.body).toContain(
        "Data,Descrição,Categoria,Conta,Tipo,Valor,Pago",
      );
      expect(response.body).toContain(
        "2024-01-01,Teste,Food,Wallet,EXPENSE,100,Sim",
      );
    });

    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reports/export/csv",
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
