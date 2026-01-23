import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, WalletType, Wallet, Prisma } from "@prisma/client";

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

describe("Wallets Routes", () => {
  let app: ReturnType<typeof buildApp>;
  let token: string;

  const userId = "123e4567-e89b-12d3-a456-426614174000";
  const walletId = "123e4567-e89b-12d3-a456-426614174001";

  beforeEach(async () => {
    mockReset(prismaMock);
    app = buildApp();
    await app.ready();
    token = app.jwt.sign({ sub: userId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/wallets", () => {
    const validWallet = {
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
      prismaMock.wallet.create.mockResolvedValue({
        id: walletId,
        name: validWallet.name,
        color: validWallet.color,
        icon: validWallet.icon,
        type: "CREDIT" as WalletType,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        creditCardInfo: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          closingDay: validWallet.closingDay,
          dueDay: validWallet.dueDay,
          limit: { toNumber: () => validWallet.limit }, // Mock do Decimal
          brand: validWallet.brand,
          walletId,
        },
      } as unknown as Wallet);

      const response = await app.inject({
        method: "POST",
        url: "/api/wallets",
        headers: { authorization: `Bearer ${token}` },
        payload: validWallet,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(validWallet.name);
      expect(body.creditCardInfo.limit).toBe(5000);
    });

    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/wallets",
        payload: validWallet,
      });
      expect(response.statusCode).toBe(401);
    });

    it("deve retornar 409 para nome duplicado", async () => {
      // Simula erro de constraint do Prisma
      const error = new Error("Unique constraint failed");
      prismaMock.wallet.create.mockRejectedValue(error);

      const response = await app.inject({
        method: "POST",
        url: "/api/wallets",
        headers: { authorization: `Bearer ${token}` },
        payload: validWallet,
      });

      // Nota: O WalletsService traduz "Unique constraint" para a mensagem que o Router captura
      expect(response.statusCode).toBe(409);
    });
  });

  describe("GET /api/wallets", () => {
    it("deve listar contas", async () => {
      (prismaMock.transaction.groupBy as any).mockResolvedValue([] as any);

      prismaMock.wallet.findMany.mockResolvedValue([
        {
          id: walletId,
          name: "Conta 1",
          color: "#FF5722",
          icon: "pi-wallet",
          type: "STANDARD",
          ownerId: userId,
          initialBalance: new Prisma.Decimal(0),
          creditCardInfo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as Wallet,
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/wallets",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(1);
    });
  });
});
