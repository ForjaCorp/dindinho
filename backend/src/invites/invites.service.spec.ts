import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PrismaClient,
  InviteStatus as PrismaInviteStatus,
  ResourcePermission as PrismaResourcePermission,
  User,
  Account,
  AccountAccess,
  AuditLog,
  Prisma,
} from "@prisma/client";
import {
  InvitesService,
  InvitePermissionError,
  InviteExpiredError,
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

    // Mock global da transação para todos os testes
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      return fn(mockPrisma);
    });
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

    it("deve criar um convite com token único e invalidar anteriores (idempotência)", async () => {
      // Mock do remetente
      mockPrisma.user.findUnique.mockResolvedValue({
        id: senderId,
        email: "remetente@example.com",
      } as User);

      // Mock da verificação de proprietário
      mockPrisma.account.findMany.mockResolvedValue([
        { id: accountId, ownerId: senderId },
      ] as Account[]);

      // Mock da expiração de convites anteriores
      mockPrisma.invite.updateMany.mockResolvedValue({
        count: 1,
      } as Prisma.BatchPayload);

      const mockInvite = {
        id: "invite-123",
        token: "random-token-123",
        email: receiverEmail.toLowerCase(),
        senderId,
        status: PrismaInviteStatus.PENDING,
        expiresAt: new Date(),
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

      expect(mockPrisma.invite.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: receiverEmail.toLowerCase(),
            status: PrismaInviteStatus.PENDING,
          }),
        }),
      );
      expect(mockPrisma.invite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: expect.any(String),
          }),
        }),
      );
      expect(result.token).toBe("random-token-123");
    });

    it("deve lançar erro ao tentar convidar a si mesmo", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: senderId,
        email: receiverEmail,
      } as User);

      await expect(
        service.createInvite(senderId, validInviteData),
      ).rejects.toThrow(InvitePermissionError);
    });
  });

  describe("updateInviteStatus", () => {
    const inviteId = "invite-123";
    const userId = "user-456";

    it("deve aceitar um convite, criar acesso e registrar auditoria", async () => {
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

      // Mock da verificação de proprietário (sender ainda é OWNER)
      mockPrisma.account.findMany.mockResolvedValue([
        { id: accountId, ownerId: senderId },
      ] as Account[]);

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

      mockPrisma.invite.update.mockResolvedValue(
        mockUpdatedInvite as unknown as InviteWithRelations,
      );
      mockPrisma.accountAccess.upsert.mockResolvedValue(
        {} as unknown as AccountAccess,
      );
      mockPrisma.auditLog.create.mockResolvedValue({} as unknown as AuditLog);

      const result = await service.updateInviteStatus(
        userId,
        receiverEmail,
        inviteId,
        { status: InviteStatus.ACCEPTED },
      );

      expect(result.status).toBe(InviteStatus.ACCEPTED);
      expect(mockPrisma.accountAccess.upsert).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            action: "INVITE_ACCEPTED",
            resourceId: accountId,
          }),
        }),
      );
    });

    it("deve buscar convite pelo token", async () => {
      const token = "secure-token-123";
      mockPrisma.invite.findUnique.mockResolvedValue({
        id: "invite-1",
        token,
        email: receiverEmail,
        senderId,
        sender: { id: senderId, name: "Sender" },
        accounts: [
          { accountId, account: { name: "Acc" }, permission: "VIEWER" },
        ],
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10000),
        createdAt: new Date(),
      } as unknown as InviteWithRelations);

      const result = await service.getInviteByToken(token);

      expect(result.token).toBe(token);
      expect(mockPrisma.invite.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token } }),
      );
    });

    it("deve lançar InviteExpiredError se o convite estiver expirado", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: receiverEmail,
        status: PrismaInviteStatus.PENDING,
        expiresAt: new Date(Date.now() - 10000),
      } as unknown as InviteWithRelations);

      await expect(
        service.updateInviteStatus(userId, receiverEmail, inviteId, {
          status: InviteStatus.ACCEPTED,
        }),
      ).rejects.toThrow(InviteExpiredError);
    });

    it("deve lançar InviteExpiredError se o status já for EXPIRED", async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: receiverEmail,
        status: PrismaInviteStatus.EXPIRED,
        expiresAt: new Date(Date.now() + 10000),
      } as unknown as InviteWithRelations);

      await expect(
        service.updateInviteStatus(userId, receiverEmail, inviteId, {
          status: InviteStatus.ACCEPTED,
        }),
      ).rejects.toThrow(InviteExpiredError);
    });

    it("deve lançar erro se o remetente não for mais dono das contas", async () => {
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

      // Mock da verificação de proprietário (sender NÃO é mais OWNER)
      mockPrisma.account.findMany.mockResolvedValue([]);

      await expect(
        service.updateInviteStatus(userId, receiverEmail, inviteId, {
          status: InviteStatus.ACCEPTED,
        }),
      ).rejects.toThrow(InvitePermissionError);
    });
  });

  describe("getInviteByToken", () => {
    it("deve lançar InviteExpiredError se o convite estiver expirado", async () => {
      const token = "expired-token";
      mockPrisma.invite.findUnique.mockResolvedValue({
        id: "invite-1",
        token,
        status: "PENDING",
        expiresAt: new Date(Date.now() - 10000),
      } as unknown as InviteWithRelations);

      await expect(service.getInviteByToken(token)).rejects.toThrow(
        InviteExpiredError,
      );
    });
  });
});
