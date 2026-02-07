import { describe, it, expect, beforeEach } from "vitest";
import { TransactionsService } from "./transactions.service";
import { PrismaClient } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import {
  TransactionType,
  Transaction,
  Account,
  ResourcePermission,
  Category,
  AccountType,
  AccountAccess,
} from "@prisma/client";
import { ForbiddenError } from "../lib/domain-exceptions";

describe("TransactionsService", () => {
  let service: TransactionsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new TransactionsService(prisma);
  });

  describe("Permissões", () => {
    const userId = "user-1";
    const accountId = "acc-1";
    const otherUserId = "user-2";

    it("deve permitir criar transação se for OWNER da conta", async () => {
      const txDate = new Date();
      prisma.category.findUnique.mockResolvedValue({
        id: "cat-1",
        userId: userId,
      } as unknown as Category);

      prisma.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: userId,
        type: AccountType.STANDARD,
      } as unknown as Account);

      prisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        amount: { toNumber: () => 100 },
        date: txDate,
        type: TransactionType.EXPENSE,
        isPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Transaction);

      const result = await service.create(userId, {
        accountId,
        categoryId: "cat-1",
        amount: 100,
        type: "EXPENSE",
        isPaid: true,
        date: txDate.toISOString(),
        description: "Teste",
      });

      expect(result).toBeDefined();
    });

    it("deve permitir criar transação se for EDITOR da conta", async () => {
      const txDate = new Date();
      prisma.category.findUnique.mockResolvedValue({
        id: "cat-1",
        userId: null, // Categoria global
      } as unknown as Category);

      prisma.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: otherUserId,
        type: AccountType.STANDARD,
      } as unknown as Account);

      prisma.accountAccess.findUnique.mockResolvedValue({
        permission: ResourcePermission.EDITOR,
      } as unknown as AccountAccess);

      prisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        amount: { toNumber: () => 100 },
        date: txDate,
        type: TransactionType.EXPENSE,
        isPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Transaction);

      const result = await service.create(userId, {
        accountId,
        categoryId: "cat-1",
        amount: 100,
        type: "EXPENSE",
        isPaid: true,
        date: txDate.toISOString(),
        description: "Teste",
      });

      expect(result).toBeDefined();
    });

    it("deve negar criação de transação se for VIEWER da conta", async () => {
      const txDate = new Date();
      prisma.category.findUnique.mockResolvedValue({
        id: "cat-1",
        userId: null,
      } as unknown as Category);

      prisma.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: otherUserId,
        type: AccountType.STANDARD,
      } as unknown as Account);

      prisma.accountAccess.findUnique.mockResolvedValue({
        permission: ResourcePermission.VIEWER,
      } as unknown as AccountAccess);

      await expect(
        service.create(userId, {
          accountId,
          categoryId: "cat-1",
          amount: 100,
          type: "EXPENSE",
          isPaid: true,
          date: txDate.toISOString(),
          description: "Teste",
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("deve negar atualização de transação se for VIEWER da conta", async () => {
      const txId = "tx-1";
      prisma.transaction.findUnique.mockResolvedValue({
        id: txId,
        accountId,
      } as unknown as Transaction);

      prisma.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: otherUserId,
        type: AccountType.STANDARD,
      } as unknown as Account);

      prisma.accountAccess.findUnique.mockResolvedValue({
        permission: ResourcePermission.VIEWER,
      } as unknown as AccountAccess);

      await expect(
        service.update(userId, txId, { description: "Novo" }),
      ).rejects.toThrow(ForbiddenError);
    });

    it("deve negar exclusão de transação se for VIEWER da conta", async () => {
      const txId = "tx-1";
      prisma.transaction.findUnique.mockResolvedValue({
        id: txId,
        accountId,
      } as unknown as Transaction);

      prisma.account.findUnique.mockResolvedValue({
        id: accountId,
        ownerId: otherUserId,
        type: AccountType.STANDARD,
      } as unknown as Account);

      prisma.accountAccess.findUnique.mockResolvedValue({
        permission: ResourcePermission.VIEWER,
      } as unknown as AccountAccess);

      await expect(service.delete(userId, txId, "ONE")).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  it("deve criar uma transação de despesa simples", async () => {
    const userId = "user-1";
    const accountId = "acc-1";
    const data = {
      accountId,
      categoryId: "cat-1",
      amount: 100,
      type: "EXPENSE" as const,
      isPaid: true,
      date: new Date().toISOString(),
      description: "Teste",
    };

    prisma.category.findUnique.mockResolvedValue({
      id: "cat-1",
      userId: userId,
    } as unknown as Category);

    prisma.account.findUnique.mockResolvedValue({
      id: accountId,
      ownerId: userId,
      type: AccountType.STANDARD,
      creditCardInfo: null,
    } as unknown as Account);

    prisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      accountId,
      amount: { toNumber: () => 100 },
      type: TransactionType.EXPENSE,
      date: new Date(data.date),
      description: "Teste",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Transaction);

    const result = await service.create(userId, data);

    expect(prisma.transaction.create).toHaveBeenCalled();
    expect(result).toHaveProperty("id", "tx-1");
  });

  describe("list", () => {
    it("deve aplicar filtro por startDay/endDay com timezone e endExclusive", async () => {
      const userId = "user-1";

      prisma.transaction.findMany.mockResolvedValue(
        [] as unknown as Transaction[],
      );

      await service.list(userId, {
        startDay: "2024-01-22",
        endDay: "2024-01-22",
        tzOffsetMinutes: 180,
      });

      const expectedStart = new Date(
        Date.UTC(2024, 0, 22, 0, 0, 0, 0) + 180 * 60 * 1000,
      );
      const expectedEndExclusive = new Date(
        Date.UTC(2024, 0, 23, 0, 0, 0, 0) + 180 * 60 * 1000,
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: expectedStart,
              lt: expectedEndExclusive,
            },
          }),
        }),
      );
    });

    it("deve inverter startDay/endDay quando vierem trocados", async () => {
      const userId = "user-1";

      prisma.transaction.findMany.mockResolvedValue(
        [] as unknown as Transaction[],
      );

      await service.list(userId, {
        startDay: "2024-01-30",
        endDay: "2024-01-22",
        tzOffsetMinutes: 0,
      });

      const expectedStart = new Date(Date.UTC(2024, 0, 22, 0, 0, 0, 0));
      const expectedEndExclusive = new Date(Date.UTC(2024, 0, 31, 0, 0, 0, 0));

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: expectedStart,
              lt: expectedEndExclusive,
            },
          }),
        }),
      );
    });

    it("deve tratar apenas startDay como um dia único", async () => {
      const userId = "user-1";

      prisma.transaction.findMany.mockResolvedValue(
        [] as unknown as Transaction[],
      );

      await service.list(userId, {
        startDay: "2024-01-22",
        tzOffsetMinutes: 0,
      });

      const expectedStart = new Date(Date.UTC(2024, 0, 22, 0, 0, 0, 0));
      const expectedEndExclusive = new Date(Date.UTC(2024, 0, 23, 0, 0, 0, 0));

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: expectedStart,
              lt: expectedEndExclusive,
            },
          }),
        }),
      );
    });
  });
});
