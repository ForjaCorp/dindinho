import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, AccountType, Account, Prisma } from "@prisma/client";

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

describe("Rotas de Contas", () => {
  let app: ReturnType<typeof buildApp>;
  let token: string;

  const userId = "123e4567-e89b-12d3-a456-426614174000";
  const accountId = "123e4567-e89b-12d3-a456-426614174001";

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

  describe("POST /api/accounts", () => {
    const validAccount = {
      name: "Cartão Nubank",
      color: "#8A2BE2",
      icon: "pi-credit-card",
      type: "CREDIT",
      closingDay: 10,
      dueDay: 15,
      limit: 5000,
      brand: "Mastercard",
    };

    it("deve criar conta com autenticação válida", async () => {
      prismaMock.account.create.mockResolvedValue({
        id: accountId,
        name: validAccount.name,
        color: validAccount.color,
        icon: validAccount.icon,
        type: "CREDIT" as AccountType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        creditCardInfo: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          closingDay: validAccount.closingDay,
          dueDay: validAccount.dueDay,
          limit: { toNumber: () => validAccount.limit },
          brand: validAccount.brand,
          accountId,
        },
      } as unknown as Account);

      const response = await app.inject({
        method: "POST",
        url: "/api/accounts",
        headers: { authorization: `Bearer ${token}` },
        payload: validAccount,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(validAccount.name);
      expect(body.creditCardInfo.limit).toBe(5000);
    });

    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/accounts",
        payload: validAccount,
      });
      expect(response.statusCode).toBe(401);
    });

    it("deve retornar 409 para nome duplicado", async () => {
      // Simula erro de constraint do Prisma
      const error = new Error("Unique constraint failed");
      prismaMock.account.create.mockRejectedValue(error);

      const response = await app.inject({
        method: "POST",
        url: "/api/accounts",
        headers: { authorization: `Bearer ${token}` },
        payload: validAccount,
      });

      // Nota: O AccountsService traduz "Unique constraint" para a mensagem que o Router captura
      expect(response.statusCode).toBe(409);
    });
  });

  describe("GET /api/accounts", () => {
    it("deve listar contas", async () => {
      vi.mocked(prismaMock.transaction.groupBy).mockResolvedValue(
        [] as unknown as [],
      );

      prismaMock.account.findMany.mockResolvedValue([
        {
          id: accountId,
          name: "Conta 1",
          color: "#FF5722",
          icon: "pi-wallet",
          type: "STANDARD",
          ownerId: userId,
          initialBalance: new Prisma.Decimal(0),
          creditCardInfo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as Account,
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/accounts",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(1);
    });
  });

  describe("PATCH /api/accounts/:id", () => {
    it("deve responder preflight CORS permitindo PATCH", async () => {
      const origin = "http://localhost:4200";

      const response = await app.inject({
        method: "OPTIONS",
        url: `/api/accounts/${accountId}`,
        headers: {
          origin,
          "access-control-request-method": "PATCH",
          "access-control-request-headers": "content-type,authorization",
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
      expect(response.headers["access-control-allow-methods"]).toContain(
        "PATCH",
      );
    });

    it("deve atualizar conta padrão", async () => {
      const payload = {
        name: "Conta Atualizada",
        color: "#111111",
      };

      prismaMock.account.findUnique
        .mockResolvedValueOnce({
          id: accountId,
          ownerId: userId,
        } as unknown as Account)
        .mockResolvedValueOnce({
          id: accountId,
          type: "STANDARD",
          creditCardInfo: null,
        } as unknown as Account);

      prismaMock.account.update.mockResolvedValue({
        id: accountId,
      } as unknown as Account);

      prismaMock.account.findFirst.mockResolvedValue({
        id: accountId,
        name: payload.name,
        color: payload.color,
        icon: "pi-wallet",
        type: "STANDARD",
        ownerId: userId,
        initialBalance: new Prisma.Decimal(0),
        creditCardInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Account);

      vi.mocked(prismaMock.transaction.groupBy).mockResolvedValue(
        [] as unknown as [],
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/accounts/${accountId}`,
        headers: { authorization: `Bearer ${token}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(accountId);
      expect(body.name).toBe(payload.name);
    });

    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/accounts/${accountId}`,
        payload: { name: "X" },
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
