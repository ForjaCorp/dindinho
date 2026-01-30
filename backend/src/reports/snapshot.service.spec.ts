import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrismaClient, Account, Transaction } from "@prisma/client";
import { SnapshotService } from "./snapshot.service";
import { mockDeep, mockReset } from "vitest-mock-extended";

const mockPrisma = mockDeep<PrismaClient>();

describe("SnapshotService", () => {
  let service: SnapshotService;

  beforeEach(() => {
    mockReset(mockPrisma);
    service = new SnapshotService(mockPrisma);
  });

  describe("updateSnapshots", () => {
    it("deve criar snapshot com saldo inicial se não houver transações", async () => {
      const accountId = "acc-1";
      const startDate = new Date("2024-01-01T00:00:00Z");

      mockPrisma.account.findUnique.mockResolvedValue({
        initialBalance: 1000,
      } as unknown as Account);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await service.updateSnapshots(accountId, startDate);

      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_date: {
              accountId,
              date: startDate,
            },
          },
          create: expect.objectContaining({
            balance: 1000,
          }),
        }),
      );
    });

    it("deve calcular saldo acumulado corretamente e atualizar snapshots", async () => {
      const accountId = "acc-1";
      const startDate = new Date("2024-01-01T00:00:00Z");

      mockPrisma.account.findUnique.mockResolvedValue({
        initialBalance: 1000,
      } as unknown as Account);

      const transactions = [
        { amount: 500, date: new Date("2024-01-01T10:00:00Z") }, // Saldo: 1500
        { amount: -200, date: new Date("2024-01-02T15:00:00Z") }, // Saldo: 1300
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(
        transactions as unknown as Transaction[],
      );

      // Mock Date global para controlar "hoje"
      const mockToday = new Date("2024-01-03T00:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockToday);

      await service.updateSnapshots(accountId, startDate);

      // Deve ter chamado upsert para 2024-01-01, 2024-01-02, 2024-01-03
      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledTimes(3);

      // 2024-01-01
      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_date: {
              accountId,
              date: new Date("2024-01-01T00:00:00Z"),
            },
          },
          update: { balance: 1500 },
        }),
      );

      // 2024-01-02
      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_date: {
              accountId,
              date: new Date("2024-01-02T00:00:00Z"),
            },
          },
          update: { balance: 1300 },
        }),
      );

      // 2024-01-03 (Saldo do dia anterior se mantém)
      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_date: {
              accountId,
              date: new Date("2024-01-03T00:00:00Z"),
            },
          },
          update: { balance: 1300 },
        }),
      );

      vi.useRealTimers();
    });

    it("não deve atualizar snapshots antes da startDate", async () => {
      const accountId = "acc-1";
      const startDate = new Date("2024-01-02T00:00:00Z");

      mockPrisma.account.findUnique.mockResolvedValue({
        initialBalance: 1000,
      } as unknown as Account);

      const transactions = [
        { amount: 500, date: new Date("2024-01-01T10:00:00Z") }, // Saldo: 1500
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(
        transactions as unknown as Transaction[],
      );

      const mockToday = new Date("2024-01-02T00:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockToday);

      await service.updateSnapshots(accountId, startDate);

      // Deve atualizar apenas 2024-01-02, não 2024-01-01
      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.dailySnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_date: {
              accountId,
              date: new Date("2024-01-02T00:00:00Z"),
            },
          },
          update: { balance: 1500 },
        }),
      );

      vi.useRealTimers();
    });

    it("deve retornar silenciosamente se a conta não existir", async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await service.updateSnapshots("invalid", new Date());

      expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
    });
  });
});
