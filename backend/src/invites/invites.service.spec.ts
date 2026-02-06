import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PrismaClient,
  InviteStatus as PrismaInviteStatus,
  ResourcePermission as PrismaResourcePermission,
  User,
  SystemRole,
  Account,
} from "@prisma/client";
import {
  InvitesService,
  InvitePermissionError,
  InviteStatusError,
  InviteWithRelations,
} from "./invites.service";
import {
  CreateInviteDTO,
  InviteStatus,
  ResourcePermission,
} from "@dindinho/shared";
import { mockDeep, mockReset } from "vitest-mock-extended";

const mockPrisma = mockDeep<PrismaClient>();

describe("InvitesService", () => {
  let service: InvitesService;
  const senderId = "sender-123";
  const receiverEmail = "receiver@example.com";
  const accountId = "account-123";

  beforeEach(() => {
    mockReset(mockPrisma);
    service = new InvitesService(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createInvite", () => {
    const validInviteData: CreateInviteDTO = {
      email: receiverEmail,
      accounts: [{ accountId, permission: ResourcePermission.EDITOR }],
      expiresInDays: 7,
    };

    it("deve criar um convite com sucesso quando o remetente é OWNER", async () => {
      // Mock da verificação de proprietário
      mockPrisma.account.findMany.mockResolvedValue([
        { id: accountId, ownerId: senderId },
      ] as Account[]);

      const mockInvite = {
        id: "invite-123",
        email: receiverEmail.toLowerCase(),
        senderId,
        status: PrismaInviteStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        sender: { id: senderId, name: "Sender Name" },
        accounts: [
          {
            accountId,
            permission: PrismaResourcePermission.EDITOR,
            account: { name: "Conta Teste" },
          },
        ],
      };

      mockPrisma.invite.create.mockResolvedValue(
        mockInvite as unknown as InviteWithRelations,
      );

      const result = await service.createInvite(senderId, validInviteData);

      expect(mockPrisma.account.findMany).toHaveBeenCalled();
      expect(mockPrisma.invite.create).toHaveBeenCalled();
      expect(result.email).toBe(receiverEmail.toLowerCase());
      expect(result.accounts[0].accountName).toBe("Conta Teste");
    });

    it("deve lançar erro se o remetente não for OWNER de todas as contas", async () => {
      mockPrisma.account.findMany.mockResolvedValue([]); // Nenhuma conta encontrada onde ele é owner

      await expect(
        service.createInvite(senderId, validInviteData),
      ).rejects.toThrow(InvitePermissionError);
    });

    it("deve lançar erro ao tentar convidar a si mesmo", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: senderId,
        email: receiverEmail,
        name: "Sender",
        passwordHash: "hash",
        systemRole: SystemRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: "+5511999999999",
        avatarUrl: null,
      } as User);

      await expect(
        service.createInvite(senderId, validInviteData),
      ).rejects.toThrow(InvitePermissionError);
    });
  });

  describe("updateInviteStatus", () => {
    const inviteId = "invite-123";
    const userId = "user-456";

    it("deve aceitar um convite com sucesso", async () => {
      const mockInvite = {
        id: inviteId,
        email: receiverEmail.toLowerCase(),
        senderId,
        status: PrismaInviteStatus.PENDING,
        expiresAt: new Date(Date.now() + 10000),
        accounts: [{ accountId, permission: PrismaResourcePermission.EDITOR }],
      };

      mockPrisma.invite.findUnique.mockResolvedValue(
        mockInvite as unknown as InviteWithRelations,
      );

      const mockUpdatedInvite = {
        ...mockInvite,
        status: PrismaInviteStatus.ACCEPTED,
        createdAt: new Date(),
        sender: { id: senderId, name: "Sender Name" },
        accounts: [
          {
            accountId,
            permission: PrismaResourcePermission.EDITOR,
            account: { name: "Conta Teste" },
          },
        ],
      };

      // Mock da transação
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return fn(mockPrisma);
      });

      mockPrisma.invite.update.mockResolvedValue(
        mockUpdatedInvite as unknown as InviteWithRelations,
      );

      const result = await service.updateInviteStatus(
        userId,
        receiverEmail,
        inviteId,
        { status: InviteStatus.ACCEPTED },
      );

      expect(result.status).toBe(InviteStatus.ACCEPTED);
      expect(mockPrisma.accountAccess.createMany).toHaveBeenCalledWith({
        data: [
          { accountId, userId, permission: PrismaResourcePermission.EDITOR },
        ],
        skipDuplicates: true,
      });
    });

    it("deve rejeitar um convite com sucesso", async () => {
      const mockInvite = {
        id: inviteId,
        email: receiverEmail.toLowerCase(),
        status: PrismaInviteStatus.PENDING,
        expiresAt: new Date(Date.now() + 10000),
      };

      mockPrisma.invite.findUnique.mockResolvedValue(
        mockInvite as unknown as InviteWithRelations,
      );

      const mockRejectedInvite = {
        ...mockInvite,
        status: PrismaInviteStatus.REJECTED,
        createdAt: new Date(),
        sender: { id: senderId, name: "Sender Name" },
        accounts: [],
      };

      mockPrisma.invite.update.mockResolvedValue(
        mockRejectedInvite as unknown as InviteWithRelations,
      );

      const result = await service.updateInviteStatus(
        userId,
        receiverEmail,
        inviteId,
        { status: InviteStatus.REJECTED },
      );

      expect(result.status).toBe(InviteStatus.REJECTED);
      expect(mockPrisma.accountAccess.createMany).not.toHaveBeenCalled();
    });

    it("deve lançar erro se o email não corresponder", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: "outro@email.com",
      } as unknown as InviteWithRelations);

      await expect(
        service.updateInviteStatus(userId, receiverEmail, inviteId, {
          status: InviteStatus.ACCEPTED,
        }),
      ).rejects.toThrow(InvitePermissionError);
    });

    it("deve lançar erro se o convite já não estiver pendente", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: receiverEmail,
        status: PrismaInviteStatus.ACCEPTED,
      } as unknown as InviteWithRelations);

      await expect(
        service.updateInviteStatus(userId, receiverEmail, inviteId, {
          status: InviteStatus.ACCEPTED,
        }),
      ).rejects.toThrow(InviteStatusError);
    });

    it("deve lançar erro se o convite estiver expirado", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: receiverEmail,
        status: PrismaInviteStatus.PENDING,
        expiresAt: new Date(Date.now() - 10000), // Já expirou
      } as unknown as InviteWithRelations);

      await expect(
        service.updateInviteStatus(userId, receiverEmail, inviteId, {
          status: InviteStatus.ACCEPTED,
        }),
      ).rejects.toThrow(InviteStatusError);
    });
  });

  describe("listSentInvites", () => {
    it("deve listar convites enviados", async () => {
      const mockInvites = [
        {
          id: "invite-1",
          email: "r1@e.com",
          senderId,
          status: PrismaInviteStatus.PENDING,
          expiresAt: new Date(),
          createdAt: new Date(),
          sender: { id: senderId, name: "S" },
          accounts: [],
        },
      ];

      mockPrisma.invite.findMany.mockResolvedValue(
        mockInvites as unknown as InviteWithRelations[],
      );

      const result = await service.listSentInvites(senderId);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("r1@e.com");
      expect(mockPrisma.invite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { senderId } }),
      );
    });
  });

  describe("listReceivedInvites", () => {
    it("deve listar convites recebidos", async () => {
      const mockInvites = [
        {
          id: "invite-1",
          email: receiverEmail,
          senderId: "other",
          status: PrismaInviteStatus.PENDING,
          expiresAt: new Date(),
          createdAt: new Date(),
          sender: { id: "other", name: "O" },
          accounts: [],
        },
      ];

      mockPrisma.invite.findMany.mockResolvedValue(
        mockInvites as unknown as InviteWithRelations[],
      );

      const result = await service.listReceivedInvites(receiverEmail);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(receiverEmail);
      expect(mockPrisma.invite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: receiverEmail } }),
      );
    });
  });

  describe("deleteInvite", () => {
    const inviteId = "invite-123";

    it("deve deletar convite se for o remetente", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        id: inviteId,
        senderId,
      } as unknown as InviteWithRelations);

      await service.deleteInvite(senderId, inviteId);

      expect(mockPrisma.invite.delete).toHaveBeenCalledWith({
        where: { id: inviteId },
      });
    });

    it("deve lançar erro se não for o remetente", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        id: inviteId,
        senderId: "outro-usuario",
      } as unknown as InviteWithRelations);

      await expect(service.deleteInvite(senderId, inviteId)).rejects.toThrow(
        InvitePermissionError,
      );
    });
  });
});
