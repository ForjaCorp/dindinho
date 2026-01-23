import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PrismaClient, WalletType, Prisma } from "@prisma/client";
import { WalletsService } from "./wallets.service";
import { CreateWalletDTO } from "@dindinho/shared";

// Mock do PrismaClient
const mockPrisma = {
  wallet: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  transaction: {
    groupBy: vi.fn(),
  },
} as unknown as PrismaClient;

describe("WalletsService", () => {
  let service: WalletsService;

  beforeEach(() => {
    service = new WalletsService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    const userId = "user-123";
    const validWalletData: CreateWalletDTO = {
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
      const standardWalletData = {
        name: "Minha Conta",
        color: "#FF5722",
        icon: "pi-wallet",
        type: "STANDARD" as const,
        initialBalance: 123.45,
      };

      const mockWallet = {
        id: "wallet-123",
        name: standardWalletData.name,
        color: standardWalletData.color,
        icon: standardWalletData.icon,
        type: "STANDARD" as WalletType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(standardWalletData.initialBalance),
        createdAt: new Date(),
        updatedAt: new Date(),
        creditCardInfo: null,
      };

      vi.mocked(mockPrisma.wallet.create).mockResolvedValue(mockWallet);

      const result = await service.create(userId, standardWalletData);

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          ...standardWalletData,
          type: "STANDARD" as WalletType,
          ownerId: userId,
          creditCardInfo: undefined,
        },
        include: {
          creditCardInfo: true,
        },
      });

      expect(result).toEqual({
        id: mockWallet.id,
        name: mockWallet.name,
        color: mockWallet.color,
        icon: mockWallet.icon,
        type: mockWallet.type,
        ownerId: mockWallet.ownerId,
        creditCardInfo: null,
        balance: 123.45,
        createdAt: mockWallet.createdAt.toISOString(),
        updatedAt: mockWallet.updatedAt.toISOString(),
      });
    });

    /**
     * Testa criação bem-sucedida de conta de crédito.
     */
    it("deve criar conta de crédito com sucesso", async () => {
      const mockWallet = {
        id: "wallet-123",
        name: validWalletData.name,
        color: validWalletData.color,
        icon: validWalletData.icon,
        type: "CREDIT" as WalletType,
        ownerId: userId,
        initialBalance: new Prisma.Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        creditCardInfo: {
          id: "credit-123",
          closingDay: validWalletData.closingDay!,
          dueDay: validWalletData.dueDay!,
          limit: { toNumber: () => validWalletData.limit! },
          brand: validWalletData.brand,
          walletId: "wallet-123",
        },
      };

      vi.mocked(mockPrisma.wallet.create).mockResolvedValue(mockWallet);

      const result = await service.create(userId, validWalletData);

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          name: validWalletData.name,
          color: validWalletData.color,
          icon: validWalletData.icon,
          type: "CREDIT" as WalletType,
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
        id: mockWallet.id,
        name: mockWallet.name,
        color: mockWallet.color,
        icon: mockWallet.icon,
        type: mockWallet.type,
        ownerId: mockWallet.ownerId,
        creditCardInfo: {
          ...mockWallet.creditCardInfo,
          limit: 5000,
          availableLimit: 5000,
        },
        balance: 0,
        createdAt: mockWallet.createdAt.toISOString(),
        updatedAt: mockWallet.updatedAt.toISOString(),
      });
    });

    /**
     * Testa tratamento de erro de constraint unique.
     */
    it("deve lançar erro de nome duplicado", async () => {
      const error = new Error("Unique constraint failed");
      vi.mocked(mockPrisma.wallet.create).mockRejectedValue(error);

      await expect(service.create(userId, validWalletData)).rejects.toThrow(
        'Já existe uma conta com nome "Cartão Nubank" para este usuário',
      );
    });

    /**
     * Testa tratamento de erro de foreign key.
     */
    it("deve lançar erro de usuário não encontrado", async () => {
      const error = new Error("Foreign key constraint failed");
      vi.mocked(mockPrisma.wallet.create).mockRejectedValue(error);

      await expect(service.create(userId, validWalletData)).rejects.toThrow(
        "Usuário não encontrado",
      );
    });

    /**
     * Testa tratamento de erro de validação.
     */
    it("deve lançar erro de dados inválidos", async () => {
      const error = new Error("Argument validation failed");
      vi.mocked(mockPrisma.wallet.create).mockRejectedValue(error);

      await expect(service.create(userId, validWalletData)).rejects.toThrow(
        "Dados inválidos fornecidos para criação da conta",
      );
    });

    /**
     * Testa tratamento de erro genérico.
     */
    it("deve lançar erro genérico para falhas desconhecidas", async () => {
      const error = new Error("Unknown database error");
      vi.mocked(mockPrisma.wallet.create).mockRejectedValue(error);

      await expect(service.create(userId, validWalletData)).rejects.toThrow(
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
      const mockWallets = [
        {
          id: "wallet-1",
          name: "Conta 1",
          color: "#FF5722",
          icon: "pi-wallet",
          type: "STANDARD" as WalletType,
          ownerId: userId,
          initialBalance: new Prisma.Decimal(100),
          createdAt: new Date(),
          updatedAt: new Date(),
          creditCardInfo: null,
        },
        {
          id: "wallet-2",
          name: "Cartão Nubank",
          color: "#8A2BE2",
          icon: "pi-credit-card",
          type: "CREDIT" as WalletType,
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
            walletId: "wallet-2",
          },
        },
      ];

      vi.mocked(mockPrisma.wallet.findMany).mockResolvedValue(mockWallets);

      vi.mocked(mockPrisma.transaction.groupBy)
        .mockResolvedValueOnce([
          {
            walletId: "wallet-1",
            type: "INCOME",
            _sum: { amount: { toNumber: () => 50 } },
          },
          {
            walletId: "wallet-1",
            type: "EXPENSE",
            _sum: { amount: { toNumber: () => 20 } },
          },
        ] as any)
        .mockResolvedValueOnce([
          { walletId: "wallet-2", _sum: { amount: { toNumber: () => 200 } } },
        ] as any);

      const result = await service.findAllByUserId(userId);

      expect(mockPrisma.wallet.findMany).toHaveBeenCalledWith({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockWallets[0].id,
        name: mockWallets[0].name,
        color: mockWallets[0].color,
        icon: mockWallets[0].icon,
        type: mockWallets[0].type,
        ownerId: mockWallets[0].ownerId,
        creditCardInfo: null,
        balance: 130,
        createdAt: mockWallets[0].createdAt.toISOString(),
        updatedAt: mockWallets[0].updatedAt.toISOString(),
      });
      expect(result[1]).toEqual({
        id: mockWallets[1].id,
        name: mockWallets[1].name,
        color: mockWallets[1].color,
        icon: mockWallets[1].icon,
        type: mockWallets[1].type,
        ownerId: mockWallets[1].ownerId,
        creditCardInfo: {
          ...mockWallets[1].creditCardInfo,
          limit: 5000,
          availableLimit: 4800,
        },
        balance: 0,
        createdAt: mockWallets[1].createdAt.toISOString(),
        updatedAt: mockWallets[1].updatedAt.toISOString(),
      });
    });

    /**
     * Testa tratamento de erro de conexão.
     */
    it("deve lançar erro de conexão com banco", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(mockPrisma.wallet.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Erro de conexão com o banco de dados",
      );
    });

    /**
     * Testa tratamento de erro de permissão.
     */
    it("deve lançar erro de permissão", async () => {
      const error = new Error("permission denied");
      vi.mocked(mockPrisma.wallet.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Sem permissão para acessar as contas",
      );
    });

    /**
     * Testa tratamento de erro genérico.
     */
    it("deve lançar erro genérico para falhas desconhecidas", async () => {
      const error = new Error("Unknown database error");
      vi.mocked(mockPrisma.wallet.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Erro inesperado ao buscar conta",
      );
    });
  });
});
