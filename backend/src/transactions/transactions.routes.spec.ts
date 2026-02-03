import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import {
  PrismaClient,
  Prisma,
  TransactionType,
  Account,
  Category,
  Transaction,
} from "@prisma/client";
import Fastify, { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import fastifyJwt from "@fastify/jwt";
import { ZodError } from "zod";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { transactionsRoutes } from "./transactions.routes";
import { prisma } from "../lib/prisma";
import authPlugin from "../plugins/auth";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("Rotas de Transações", () => {
  let app: FastifyInstance;
  let token: string;

  const userId = "123e4567-e89b-12d3-a456-426614174000";
  const accountId = "123e4567-e89b-12d3-a456-426614174001";
  const categoryId = "123e4567-e89b-12d3-a456-426614174099";

  beforeEach(async () => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    mockReset(prismaMock);

    prismaMock.$transaction.mockImplementation(
      async (fn: (prisma: PrismaClient) => Promise<unknown>) => {
        return fn(prismaMock);
      },
    );

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.setErrorHandler((error, request, reply) => {
      if (error instanceof ZodError) {
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message: "Os dados fornecidos são inválidos.",
          code: "VALIDATION_ERROR",
          issues: error.issues,
        });
      }

      if (error instanceof Error && "statusCode" in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        return reply.status(statusCode).send({
          statusCode,
          error: "Error",
          message: error.message,
        });
      }

      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro inesperado.",
      });
    });

    await app.register(fastifyJwt, { secret: "test-secret" });
    await app.register(authPlugin);
    await app.register(transactionsRoutes, { prefix: "/transactions" });

    await app.ready();
    token = app.jwt.sign({ sub: userId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /transactions", () => {
    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        payload: {
          accountId,
          categoryId,
          amount: 10,
          description: "Teste",
          type: "EXPENSE",
          date: new Date().toISOString(),
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("deve criar uma transação simples", async () => {
      const payload = {
        accountId,
        categoryId,
        amount: 123.45,
        description: "Café",
        type: "EXPENSE",
        isPaid: true,
        date: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      };

      prismaMock.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
        creditCardInfo: null,
      } as unknown as Account);

      prismaMock.category.findUnique.mockResolvedValue({
        id: categoryId,
        userId: null,
      } as unknown as Category);

      prismaMock.transaction.create.mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174010",
        accountId,
        categoryId,
        amount: new Prisma.Decimal(payload.amount),
        description: payload.description,
        date: new Date(payload.date),
        type: TransactionType.EXPENSE,
        isPaid: true,
        transferId: null,
        recurrenceId: null,
        recurrenceFrequency: null,
        recurrenceIntervalDays: null,
        installmentNumber: null,
        totalInstallments: null,
        tags: null,
        purchaseDate: null,
        invoiceMonth: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as unknown as Transaction);

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: { authorization: `Bearer ${token}` },
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.accountId).toBe(accountId);
      expect(body.amount).toBe(payload.amount);
      expect(body.type).toBe("EXPENSE");
    });

    it("deve retornar 404 se o banco rejeitar categoryId inexistente", async () => {
      const payload = {
        accountId,
        categoryId,
        amount: 123.45,
        description: "Café",
        type: "EXPENSE",
        isPaid: true,
        date: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      };

      prismaMock.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
        creditCardInfo: null,
      } as unknown as Account);

      prismaMock.category.findUnique.mockResolvedValue({
        id: categoryId,
        userId: null,
      } as unknown as Category);

      const error = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "5.14.0",
          meta: {
            field_name: "Transaction_categoryId_fkey (index)",
          },
        },
      );
      prismaMock.transaction.create.mockRejectedValue(error);

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: { authorization: `Bearer ${token}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Categoria não encontrada");
    });

    it("deve criar transações parceladas", async () => {
      const payload = {
        accountId,
        categoryId,
        amount: 1000,
        description: "Notebook",
        type: "EXPENSE",
        isPaid: true,
        totalInstallments: 3,
        date: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      };

      prismaMock.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
        creditCardInfo: null,
      } as unknown as Account);

      prismaMock.category.findUnique.mockResolvedValue({
        id: categoryId,
        userId: null,
      } as unknown as Category);

      prismaMock.transaction.create
        .mockResolvedValueOnce({
          id: "123e4567-e89b-12d3-a456-426614174011",
          accountId,
          categoryId,
          amount: new Prisma.Decimal(333.33),
          description: payload.description,
          date: new Date("2026-01-01T00:00:00.000Z"),
          type: TransactionType.EXPENSE,
          isPaid: true,
          transferId: null,
          recurrenceId: "rec",
          recurrenceFrequency: null,
          recurrenceIntervalDays: null,
          installmentNumber: 1,
          totalInstallments: 3,
          tags: null,
          purchaseDate: null,
          invoiceMonth: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        } as unknown as Transaction)
        .mockResolvedValueOnce({
          id: "123e4567-e89b-12d3-a456-426614174012",
          accountId,
          categoryId,
          amount: new Prisma.Decimal(333.33),
          description: payload.description,
          date: new Date("2026-02-01T00:00:00.000Z"),
          type: TransactionType.EXPENSE,
          isPaid: false,
          transferId: null,
          recurrenceId: "rec",
          recurrenceFrequency: null,
          recurrenceIntervalDays: null,
          installmentNumber: 2,
          totalInstallments: 3,
          tags: null,
          purchaseDate: null,
          invoiceMonth: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        } as unknown as Transaction)
        .mockResolvedValueOnce({
          id: "123e4567-e89b-12d3-a456-426614174013",
          accountId,
          categoryId,
          amount: new Prisma.Decimal(333.34),
          description: payload.description,
          date: new Date("2026-03-01T00:00:00.000Z"),
          type: TransactionType.EXPENSE,
          isPaid: false,
          transferId: null,
          recurrenceId: "rec",
          recurrenceFrequency: null,
          recurrenceIntervalDays: null,
          installmentNumber: 3,
          totalInstallments: 3,
          tags: null,
          purchaseDate: null,
          invoiceMonth: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        } as unknown as Transaction);

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: { authorization: `Bearer ${token}` },
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);
      const amounts = body.map((t: { amount: number }) => t.amount);
      expect(amounts.reduce((a: number, b: number) => a + b, 0)).toBe(1000);
    });
  });

  describe("GET /transactions", () => {
    it("deve listar transações da conta", async () => {
      prismaMock.account.count.mockResolvedValue(1);

      prismaMock.transaction.findMany.mockResolvedValue([
        {
          id: "123e4567-e89b-12d3-a456-426614174014",
          accountId,
          categoryId: null,
          amount: new Prisma.Decimal(10),
          description: null,
          date: new Date("2026-01-01T00:00:00.000Z"),
          type: TransactionType.INCOME,
          isPaid: true,
          transferId: null,
          recurrenceId: null,
          recurrenceFrequency: null,
          recurrenceIntervalDays: null,
          installmentNumber: null,
          totalInstallments: null,
          tags: null,
          purchaseDate: null,
          invoiceMonth: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ] as unknown as Transaction[]);

      const response = await app.inject({
        method: "GET",
        url: `/transactions?accountId=${accountId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].accountId).toBe(accountId);
      expect(body.nextCursorId).toBeNull();
    });

    it("deve listar transações filtradas por categoria", async () => {
      prismaMock.transaction.findMany.mockResolvedValue([
        {
          id: "123e4567-e89b-12d3-a456-426614174015",
          accountId,
          categoryId,
          amount: new Prisma.Decimal(10),
          description: "Café",
          date: new Date("2026-01-01T00:00:00.000Z"),
          type: TransactionType.EXPENSE,
          isPaid: true,
          transferId: null,
          recurrenceId: null,
          recurrenceFrequency: null,
          recurrenceIntervalDays: null,
          installmentNumber: null,
          totalInstallments: null,
          tags: null,
          purchaseDate: null,
          invoiceMonth: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ] as unknown as Transaction[]);

      const response = await app.inject({
        method: "GET",
        url: "/transactions",
        query: { categoryId },
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].categoryId).toBe(categoryId);

      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId,
            account: expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ ownerId: userId }),
              ]),
            }),
          }),
        }),
      );
    });

    it("deve listar transações com paginação", async () => {
      prismaMock.transaction.findMany
        .mockResolvedValueOnce([
          {
            id: "123e4567-e89b-12d3-a456-426614174014",
            accountId,
            categoryId: null,
            amount: new Prisma.Decimal(10),
            description: null,
            date: new Date("2026-01-02T00:00:00.000Z"),
            type: TransactionType.INCOME,
            isPaid: true,
            transferId: null,
            recurrenceId: null,
            recurrenceFrequency: null,
            recurrenceIntervalDays: null,
            installmentNumber: null,
            totalInstallments: null,
            tags: null,
            purchaseDate: null,
            invoiceMonth: null,
            createdAt: new Date("2026-01-02T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          },
        ] as unknown as Transaction[])
        .mockResolvedValueOnce([
          {
            id: "123e4567-e89b-12d3-a456-426614174013",
            accountId,
            categoryId: null,
            amount: new Prisma.Decimal(5),
            description: null,
            date: new Date("2026-01-01T00:00:00.000Z"),
            type: TransactionType.INCOME,
            isPaid: true,
            transferId: null,
            recurrenceId: null,
            recurrenceFrequency: null,
            recurrenceIntervalDays: null,
            installmentNumber: null,
            totalInstallments: null,
            tags: null,
            purchaseDate: null,
            invoiceMonth: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ] as unknown as Transaction[]);

      const response1 = await app.inject({
        method: "GET",
        url: `/transactions?limit=1`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.items).toHaveLength(1);
      expect(body1.nextCursorId).toBe("123e4567-e89b-12d3-a456-426614174014");

      const response2 = await app.inject({
        method: "GET",
        url: `/transactions?limit=1&cursorId=${body1.nextCursorId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.items).toHaveLength(1);
      expect(body2.items[0].id).toBe("123e4567-e89b-12d3-a456-426614174013");
    });
  });

  describe("GET /transactions/:id", () => {
    it("deve obter transação por id", async () => {
      const id = "123e4567-e89b-12d3-a456-426614174099";

      prismaMock.transaction.findFirst.mockResolvedValue({
        id,
        accountId,
        categoryId: null,
        amount: new Prisma.Decimal(10),
        description: "Café",
        date: new Date("2026-01-01T00:00:00.000Z"),
        type: TransactionType.EXPENSE,
        isPaid: true,
        transferId: null,
        recurrenceId: null,
        recurrenceFrequency: null,
        recurrenceIntervalDays: null,
        installmentNumber: null,
        totalInstallments: null,
        tags: null,
        purchaseDate: null,
        invoiceMonth: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      } as unknown as Transaction);

      const response = await app.inject({
        method: "GET",
        url: `/transactions/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(id);
      expect(body.accountId).toBe(accountId);
      expect(body.amount).toBe(10);
    });
  });

  describe("PATCH /transactions/:id", () => {
    it("deve atualizar transação", async () => {
      const id = "123e4567-e89b-12d3-a456-426614174099";
      const payload = {
        description: "Mercado",
        isPaid: false,
      };

      prismaMock.transaction.findUnique.mockResolvedValue({
        id,
        accountId,
        type: TransactionType.EXPENSE,
        transferId: null,
      } as unknown as Transaction);

      prismaMock.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
      } as unknown as Account);

      prismaMock.transaction.update.mockResolvedValue({
        id,
        accountId,
        categoryId: null,
        amount: new Prisma.Decimal(10),
        description: payload.description,
        date: new Date("2026-01-01T00:00:00.000Z"),
        type: TransactionType.EXPENSE,
        isPaid: payload.isPaid,
        transferId: null,
        recurrenceId: null,
        recurrenceFrequency: null,
        recurrenceIntervalDays: null,
        installmentNumber: null,
        totalInstallments: null,
        tags: null,
        purchaseDate: null,
        invoiceMonth: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      } as unknown as Transaction);

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(id);
      expect(body.description).toBe(payload.description);
      expect(body.isPaid).toBe(false);
    });

    it("deve atualizar série quando scope=ALL", async () => {
      const id = "123e4567-e89b-12d3-a456-426614174099";
      const payload = {
        description: "Mercado",
      };

      prismaMock.transaction.findUnique.mockResolvedValue({
        id,
        accountId,
        type: TransactionType.EXPENSE,
        transferId: null,
        recurrenceId: "rec-1",
        installmentNumber: 2,
        date: new Date("2026-01-02T00:00:00.000Z"),
      } as unknown as Transaction);

      prismaMock.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
      } as unknown as Account);

      prismaMock.transaction.updateMany.mockResolvedValue({
        count: 3,
      } as unknown as Prisma.BatchPayload);

      prismaMock.transaction.findFirst.mockResolvedValue({
        id,
        accountId,
        categoryId: null,
        amount: new Prisma.Decimal(10),
        description: payload.description,
        date: new Date("2026-01-02T00:00:00.000Z"),
        type: TransactionType.EXPENSE,
        isPaid: true,
        transferId: null,
        recurrenceId: "rec-1",
        recurrenceFrequency: null,
        recurrenceIntervalDays: null,
        installmentNumber: 2,
        totalInstallments: 3,
        tags: null,
        purchaseDate: null,
        invoiceMonth: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-03T00:00:00.000Z"),
      } as unknown as Transaction);

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${id}?scope=ALL`,
        headers: { authorization: `Bearer ${token}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(id);
      expect(body.description).toBe(payload.description);

      expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          recurrenceId: "rec-1",
        },
        data: { description: payload.description },
      });
    });
  });

  describe("DELETE /transactions/:id", () => {
    it("deve excluir transação", async () => {
      const id = "123e4567-e89b-12d3-a456-426614174099";

      prismaMock.transaction.findUnique.mockResolvedValue({
        id,
        accountId,
        transferId: null,
        recurrenceId: null,
        installmentNumber: null,
      } as unknown as Transaction);

      prismaMock.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
      } as unknown as Account);

      prismaMock.transaction.delete.mockResolvedValue({
        id,
      } as unknown as Transaction);

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${id}?scope=ONE`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.deletedIds).toEqual([id]);
    });
  });
});
