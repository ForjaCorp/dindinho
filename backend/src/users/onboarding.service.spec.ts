import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PrismaClient, Invite, AccountAccess, AuditLog } from "@prisma/client";
import { OnboardingService } from "./onboarding.service";
import { mockDeep, mockReset } from "vitest-mock-extended";

const mockPrisma = mockDeep<PrismaClient>();

describe("OnboardingService", () => {
  let service: OnboardingService;

  beforeEach(() => {
    mockReset(mockPrisma);
    service = new OnboardingService(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processPendingInvites", () => {
    const userId = "new-user-123";
    const email = "novo@example.com";

    it("deve processar convites pendentes e criar acessos (Auto-link)", async () => {
      const pendingInvites = [
        {
          id: "invite-1",
          email: email,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 10000),
          accounts: [{ accountId: "acc-1", permission: "VIEWER" }],
        },
      ];

      mockPrisma.invite.findMany.mockResolvedValue(
        pendingInvites as unknown as Invite[],
      );
      mockPrisma.invite.update.mockResolvedValue({} as unknown as Invite);
      mockPrisma.accountAccess.upsert.mockResolvedValue(
        {} as unknown as AccountAccess,
      );
      mockPrisma.auditLog.create.mockResolvedValue({} as unknown as AuditLog);

      await service.processPendingInvites(userId, email);

      // Verifica se buscou convites para o email correto
      expect(mockPrisma.invite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: email.toLowerCase(),
            status: "PENDING",
          }),
        }),
      );

      // Verifica se atualizou o status do convite
      expect(mockPrisma.invite.update).toHaveBeenCalledWith({
        where: { id: "invite-1" },
        data: { status: "ACCEPTED" },
      });

      // Verifica se criou o acesso
      expect(mockPrisma.accountAccess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            accountId_userId: { accountId: "acc-1", userId },
          },
        }),
      );

      // Verifica se registrou auditoria
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            action: "AUTO_LINK_INVITE",
            resourceId: "acc-1",
          }),
        }),
      );
    });

    it("não deve fazer nada se não houver convites pendentes", async () => {
      mockPrisma.invite.findMany.mockResolvedValue([]);

      await service.processPendingInvites(userId, email);

      expect(mockPrisma.invite.update).not.toHaveBeenCalled();
      expect(mockPrisma.accountAccess.upsert).not.toHaveBeenCalled();
    });
  });
});
