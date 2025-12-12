import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PrismaClient, WalletType } from "@prisma/client";
import { WalletsService } from "./wallets.service";
import { CreateWalletDTO } from "@dindinho/shared";

// Mock do PrismaClient
const mockPrisma = {
  wallet: {
    create: vi.fn(),
    findMany: vi.fn(),
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
      closingDay: 10,
      dueDay: 15,
      limit: 5000,
      brand: "Mastercard",
    };

    /**
     * Testa criação bem-sucedida de carteira padrão.
     */
    it("deve criar carteira padrão com sucesso", async () => {
      const standardWalletData = {
        name: "Minha Carteira",
        color: "#FF5722",
        icon: "pi-wallet",
        type: "STANDARD" as const,
      };

      const mockWallet = {
        id: "wallet-123",
        ...standardWalletData,
        type: "STANDARD" as WalletType,
        ownerId: userId,
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
        ...mockWallet,
        balance: 0,
        createdAt: mockWallet.createdAt.toISOString(),
        updatedAt: mockWallet.updatedAt.toISOString(),
      });
    });

    /**
     * Testa criação bem-sucedida de carteira de crédito.
     */
    it("deve criar carteira de crédito com sucesso", async () => {
      const mockWallet = {
        id: "wallet-123",
        name: validWalletData.name,
        color: validWalletData.color,
        icon: validWalletData.icon,
        type: "CREDIT" as WalletType,
        ownerId: userId,
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
        ...mockWallet,
        creditCardInfo: {
          ...mockWallet.creditCardInfo,
          limit: 5000,
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
        'Já existe uma carteira com nome "Cartão Nubank" para este usuário',
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
        "Dados inválidos fornecidos para criação da carteira",
      );
    });

    /**
     * Testa tratamento de erro genérico.
     */
    it("deve lançar erro genérico para falhas desconhecidas", async () => {
      const error = new Error("Unknown database error");
      vi.mocked(mockPrisma.wallet.create).mockRejectedValue(error);

      await expect(service.create(userId, validWalletData)).rejects.toThrow(
        "Erro inesperado ao criar carteira",
      );
    });
  });

  describe("findAllByUserId", () => {
    const userId = "user-123";

    /**
     * Testa listagem bem-sucedida de carteiras.
     */
    it("deve listar carteiras do usuário com sucesso", async () => {
      const mockWallets = [
        {
          id: "wallet-1",
          name: "Carteira 1",
          color: "#FF5722",
          icon: "pi-wallet",
          type: "STANDARD" as WalletType,
          ownerId: userId,
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

      const result = await service.findAllByUserId(userId);

      expect(mockPrisma.wallet.findMany).toHaveBeenCalledWith({
        where: { ownerId: userId },
        include: { creditCardInfo: true },
        orderBy: { createdAt: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockWallets[0],
        balance: 0,
        createdAt: mockWallets[0].createdAt.toISOString(),
        updatedAt: mockWallets[0].updatedAt.toISOString(),
      });
      expect(result[1]).toEqual({
        ...mockWallets[1],
        creditCardInfo: {
          ...mockWallets[1].creditCardInfo,
          limit: 5000,
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
        "Sem permissão para acessar as carteiras",
      );
    });

    /**
     * Testa tratamento de erro genérico.
     */
    it("deve lançar erro genérico para falhas desconhecidas", async () => {
      const error = new Error("Unknown database error");
      vi.mocked(mockPrisma.wallet.findMany).mockRejectedValue(error);

      await expect(service.findAllByUserId(userId)).rejects.toThrow(
        "Erro inesperado ao buscar carteira",
      );
    });
  });
});
