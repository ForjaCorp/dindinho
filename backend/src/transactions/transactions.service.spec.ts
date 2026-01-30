import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaClient, TransactionType, AccountType } from "@prisma/client";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { TransactionsService } from "./transactions.service";

describe("TransactionsService", () => {
  let service: TransactionsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new TransactionsService(prisma);
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
    } as any);

    prisma.account.findUnique.mockResolvedValue({
      id: accountId,
      ownerId: userId,
      type: AccountType.STANDARD,
      creditCardInfo: null,
    } as any);

    prisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      accountId,
      amount: { toNumber: () => 100 },
      type: TransactionType.EXPENSE,
      date: new Date(data.date),
      description: "Teste",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.create(userId, data);

    expect(prisma.transaction.create).toHaveBeenCalled();
    expect(result).toHaveProperty("id", "tx-1");
  });
});
