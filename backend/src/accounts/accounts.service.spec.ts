import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PrismaClient, AccountType, Prisma } from "@prisma/client";
import { AccountsService } from "./accounts.service";
import { CreateAccountDTO, UpdateAccountDTO } from "@dindinho/shared";

// Mock do PrismaClient
const mockPrisma = {
  account: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  accountAccess: {
    findUnique: vi.fn(),
  },
  transaction: {
    groupBy: vi.fn(),
  },
} as unknown as PrismaClient;

describe("AccountsService", () => {
  let service: AccountsService;

  beforeEach(() => {
    service = new AccountsService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    const userId = "user-123";
    const validAccountData: CreateAccountDTO = {
      name: "Cartão Nubank",
      color: "#8A2BE2",
      icon: "pi-credit-card",
      type: "CREDIT",
      initialBalance: 0,
      closingDay: 10,
      dueDay: 15,
      limit: 5000,
      brand: "Mastercard",
    };

    /**
     * Testa criação bem-sucedida de conta padrão.
     */
    it("deve criar conta padrão com sucesso", async () => {
      const standardAccountData = {
        name: "Minha Conta",
        color: "#FF5722",
        icon: "pi-wallet",
        type: "STANDARD" as const,
        initialBalance: 123.45,
      };

      const mockAccount = {
        id: "account-123",
        name: standardAccountData.name,
        color: standardAccountData.color,
        icon: standardAccountData.icon,
        type: "STANDARD" as AccountType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(standardAccountData.initialBalance),
        createdAt: new Date(),
        updatedAt: new Date(),
        creditCardInfo: null,
      };

      vi.mocked((mockPrisma as any).account.create).mockResolvedValue(
        mockAccount as any,
      );

      const result = await service.create(userId, standardAccountData);

      expect((mockPrisma as any).account.create).toHaveBeenCalledWith({
        data: {
          ...standardAccountData,
          type: "STANDARD" as AccountType,
          ownerId: userId,
          creditCardInfo: undefined,
        },
        include: {
          creditCardInfo: true,
        },
      });

      expect(result).toEqual({
        id: mockAccount.id,
        name: mockAccount.name,
        color: mockAccount.color,
        icon: mockAccount.icon,
        type: mockAccount.type,
        ownerId: mockAccount.ownerId,
        creditCardInfo: null,
        balance: 123.45,
        createdAt: mockAccount.createdAt.toISOString(),
        updatedAt: mockAccount.updatedAt.toISOString(),
      });
    });

    /**
     * Testa criação bem-sucedida de conta de crédito.
     */
    it("deve criar conta de crédito com sucesso", async () => {
      const mockAccount = {
        id: "account-123",
        name: validAccountData.name,
        color: validAccountData.color,
        icon: validAccountData.icon,
        type: "CREDIT" as AccountType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        creditCardInfo: {
          id: "credit-123",
          closingDay: validAccountData.closingDay!,
          dueDay: validAccountData.dueDay!,
          limit: { toNumber: () => validAccountData.limit! },
          brand: validAccountData.brand,
          accountId: "account-123",
        },
      };

      vi.mocked((mockPrisma as any).account.create).mockResolvedValue(
        mockAccount as any,
      );

      const result = await service.create(userId, validAccountData);

      expect((mockPrisma as any).account.create).toHaveBeenCalledWith({
        data: {
          name: validAccountData.name,
          color: validAccountData.color,
          icon: validAccountData.icon,
          type: "CREDIT" as AccountType,
          ownerId: userId,
          initialBalance: 0,
          creditCardInfo: {
            create: {
              closingDay: 10,
              dueDay: 15,
              limit: 5000,
              brand: "Mastercard",
            },
          },
        },
        include: {
          creditCardInfo: true,
        },
      });

      expect(result).toEqual({
        id: mockAccount.id,
        name: mockAccount.name,
        color: mockAccount.color,
        icon: mockAccount.icon,
        type: mockAccount.type,
        ownerId: mockAccount.ownerId,
        creditCardInfo: {
          ...mockAccount.creditCardInfo,
          limit: 5000,
          availableLimit: 5000,
        },
        balance: 0,
        createdAt: mockAccount.createdAt.toISOString(),
        updatedAt: mockAccount.updatedAt.toISOString(),
      });
    });

    /**
     * Testa tratamento de erro de constraint unique.
     */
    it("deve lançar erro de nome duplicado", async () => {
      const error = new Error("Unique constraint failed");
      vi.mocked((mockPrisma as any).account.create).mockRejectedValue(error);

      await expect(service.create(userId, validAccountData)).rejects.toThrow(
        'Já existe uma conta com nome "Cartão Nubank" para este usuário',
      );
    });

    /**
     * Testa tratamento de erro de foreign key.
     */
    it("deve lançar erro de usuário não encontrado", async () => {
      const error = new Error("Foreign key constraint failed");
      vi.mocked((mockPrisma as any).account.create).mockRejectedValue(error);

      await expect(service.create(userId, validAccountData)).rejects.toThrow(
        "Usuário não encontrado",
      );
    });

    /**
     * Testa tratamento de erro de validação.
     */
    it("deve lançar erro de dados inválidos", async () => {
      const error = new Error("Argument validation failed");
      vi.mocked((mockPrisma as any).account.create).mockRejectedValue(error);

      await expect(service.create(userId, validAccountData)).rejects.toThrow(
        "Dados inválidos fornecidos para criação da conta",
      );
    });

    /**
     * Testa tratamento de erro genérico.
     */
    it("deve lançar erro genérico para falhas desconhecidas", async () => {
      const error = new Error("Unknown database error");
      vi.mocked((mockPrisma as any).account.create).mockRejectedValue(error);

      await expect(service.create(userId, validAccountData)).rejects.toThrow(
        "Erro inesperado ao criar conta",
      );
    });
  });

  describe("findAllByUserId", () => {
    const userId = "user-123";

    /**
     * Testa listagem bem-sucedida de contas.
     */
    it("deve listar contas do usuário com sucesso", async () => {
      const mockAccounts = [
        {
          id: "account-1",
          name: "Conta 1",
          color: "#FF5722",
          icon: "pi-wallet",
          type: "STANDARD" as AccountType,
          ownerId: userId,
          initialBalance: new Prisma.Decimal(100),
          createdAt: new Date(),
          updatedAt: new Date(),
          creditCardInfo: null,
        },
        {
          id: "account-2",
          name: "Cartão Nubank",
          color: "#8A2BE2",
          icon: "pi-credit-card",
          type: "CREDIT" as AccountType,
          ownerId: userId,
          initialBalance: new Prisma.Decimal(0),
          createdAt: new Date(),
          updatedAt: new Date(),
          creditCardInfo: {
            id: "credit-123",
            closingDay: 10,
            dueDay: 15,
            limit: { toNumber: () => 5000 },
            brand: "Mastercard",
            accountId: "account-2",
          },
        },
      ];

      vi.mocked((mockPrisma as any).account.findMany).mockResolvedValue(
        mockAccounts as any,
      );

      vi.mocked((mockPrisma as any).transaction.groupBy)
        .mockResolvedValueOnce([
          {
            accountId: "account-1",
            type: "INCOME",
            _sum: { amount: { toNumber: () => 50 } },
          },
          {
            accountId: "account-1",
            type: "EXPENSE",
            _sum: { amount: { toNumber: () => 20 } },
          },
        ] as any)
        .mockResolvedValueOnce([
          { accountId: "account-2", _sum: { amount: { toNumber: () => 200 } } },
        ] as any);

      const result = await service.findAllByUserId(userId);

      expect((mockPrisma as any).account.findMany).toHaveBeenCalledWith({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockAccounts[0].id,
        name: mockAccounts[0].name,
        color: mockAccounts[0].color,
        icon: mockAccounts[0].icon,
        type: mockAccounts[0].type,
        ownerId: mockAccounts[0].ownerId,
        creditCardInfo: null,
        balance: 130,
        createdAt: mockAccounts[0].createdAt.toISOString(),
        updatedAt: mockAccounts[0].updatedAt.toISOString(),
      });
      expect(result[1]).toEqual({
        id: mockAccounts[1].id,
        name: mockAccounts[1].name,
        color: mockAccounts[1].color,
        icon: mockAccounts[1].icon,
        type: mockAccounts[1].type,
        ownerId: mockAccounts[1].ownerId,
        creditCardInfo: {
          ...mockAccounts[1].creditCardInfo,
          limit: 5000,
          availableLimit: 4800,
        },
        balance: 0,
        createdAt: mockAccounts[1].createdAt.toISOString(),
        updatedAt: mockAccounts[1].updatedAt.toISOString(),
      });
    });

    /**
     * Testa tratamento de erro de conexão.
     */
    it("deve lançar erro de conexão com banco", async () => {
      const error = new Error("Database connection failed");
      vi.mocked((mockPrisma as any).account.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Erro de conexão com o banco de dados",
      );
    });

    /**
     * Testa tratamento de erro de permissão.
     */
    it("deve lançar erro de permissão", async () => {
      const error = new Error("permission denied");
      vi.mocked((mockPrisma as any).account.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Sem permissão para acessar as contas",
      );
    });

    /**
     * Testa tratamento de erro genérico.
     */
    it("deve lançar erro genérico para falhas desconhecidas", async () => {
      const error = new Error("Unknown database error");
      vi.mocked((mockPrisma as any).account.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Erro inesperado ao buscar conta",
      );
    });
  });

  describe("update", () => {
    const userId = "user-123";
    const accountId = "account-123";

    it("deve atualizar conta padrão com sucesso", async () => {
      const payload: UpdateAccountDTO = {
        name: "Conta Atualizada",
        color: "#111111",
      };

      vi.mocked((mockPrisma as any).account.findUnique)
        .mockResolvedValueOnce({ id: accountId, ownerId: userId } as any)
        .mockResolvedValueOnce({
          id: accountId,
          type: "STANDARD" as AccountType,
          creditCardInfo: null,
        } as any);

      vi.mocked((mockPrisma as any).account.update).mockResolvedValue({
        id: accountId,
      } as any);

      vi.mocked((mockPrisma as any).account.findFirst).mockResolvedValue({
        id: accountId,
        name: payload.name,
        color: payload.color,
        icon: "pi-wallet",
        type: "STANDARD" as AccountType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(100),
        creditCardInfo: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      } as any);

      vi.mocked((mockPrisma as any).transaction.groupBy).mockResolvedValue([
        { type: "INCOME", _sum: { amount: { toNumber: () => 50 } } },
        { type: "EXPENSE", _sum: { amount: { toNumber: () => 20 } } },
      ] as any);

      const result = await service.update(userId, accountId, payload);

      expect((mockPrisma as any).account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: {
          name: payload.name,
          color: payload.color,
        },
      });

      expect(result).toEqual({
        id: accountId,
        name: payload.name,
        color: payload.color,
        icon: "pi-wallet",
        type: "STANDARD",
        ownerId: userId,
        creditCardInfo: null,
        balance: 130,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });
    });

    it("deve atualizar cartão de crédito e recalcular limite disponível", async () => {
      const payload: UpdateAccountDTO = {
        limit: 5000,
      };

      vi.mocked((mockPrisma as any).account.findUnique)
        .mockResolvedValueOnce({ id: accountId, ownerId: userId } as any)
        .mockResolvedValueOnce({
          id: accountId,
          type: "CREDIT" as AccountType,
          creditCardInfo: { closingDay: 10, dueDay: 15 },
        } as any);

      vi.mocked((mockPrisma as any).account.update).mockResolvedValue({
        id: accountId,
      } as any);

      vi.mocked((mockPrisma as any).account.findFirst).mockResolvedValue({
        id: accountId,
        name: "Cartão",
        color: "#222222",
        icon: "pi-credit-card",
        type: "CREDIT" as AccountType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(0),
        creditCardInfo: {
          id: "cc-1",
          closingDay: 10,
          dueDay: 15,
          limit: { toNumber: () => 5000 },
          brand: "Mastercard",
          accountId,
        },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      } as any);

      vi.mocked((mockPrisma as any).transaction.groupBy)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([
          { accountId, _sum: { amount: { toNumber: () => 200 } } },
        ] as any);

      const result = await service.update(userId, accountId, payload);

      expect((mockPrisma as any).account.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: {
          creditCardInfo: {
            upsert: {
              create: { closingDay: 10, dueDay: 15, limit: 5000 },
              update: { limit: 5000 },
            },
          },
        },
      });

      expect(result.creditCardInfo?.availableLimit).toBe(4800);
    });

    it("deve falhar ao atualizar campos de cartão em conta padrão", async () => {
      const payload: UpdateAccountDTO = { limit: 1000 };

      vi.mocked((mockPrisma as any).account.findUnique)
        .mockResolvedValueOnce({ id: accountId, ownerId: userId } as any)
        .mockResolvedValueOnce({
          id: accountId,
          type: "STANDARD" as AccountType,
          creditCardInfo: null,
        } as any);

      await expect(service.update(userId, accountId, payload)).rejects.toThrow(
        "Campos de cartão só podem ser atualizados em contas do tipo crédito",
      );
    });

    it("deve retornar 404 quando conta não existe", async () => {
      const payload: UpdateAccountDTO = { name: "X" };
      vi.mocked((mockPrisma as any).account.findUnique).mockResolvedValueOnce(
        null,
      );

      await expect(service.update(userId, accountId, payload)).rejects.toThrow(
        "Conta não encontrada",
      );
    });
  });
});
