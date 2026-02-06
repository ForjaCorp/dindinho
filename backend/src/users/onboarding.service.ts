import {
  PrismaClient,
  InviteStatus as PrismaInviteStatus,
  ResourcePermission as PrismaResourcePermission,
  Prisma,
} from "@prisma/client";

/**
 * Serviço responsável por processos de onboarding e integração de novos usuários
 * @class OnboardingService
 */
export class OnboardingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Processa convites pendentes para um novo usuário (Auto-link)
   * @async
   * @param {string} userId - ID do novo usuário
   * @param {string} email - Email do novo usuário
   * @param {Prisma.TransactionClient} tx - Cliente Prisma (opcional para transações)
   */
  async processPendingInvites(
    userId: string,
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const prisma = tx || this.prisma;
    const emailNormalized = email.trim().toLowerCase();

    // 1. Buscar convites pendentes e não expirados para este e-mail
    const pendingInvites = await prisma.invite.findMany({
      where: {
        email: emailNormalized,
        status: PrismaInviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        accounts: true,
      },
    });

    // 2. Processar cada convite
    for (const invite of pendingInvites) {
      // 2.1 Atualizar convite para ACEITO
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: PrismaInviteStatus.ACCEPTED },
      });

      // 2.2 Criar acessos às contas e registrar auditoria
      if (invite.accounts.length > 0) {
        for (const account of invite.accounts) {
          await prisma.accountAccess.upsert({
            where: {
              accountId_userId: {
                accountId: account.accountId,
                userId,
              },
            },
            create: {
              accountId: account.accountId,
              userId,
              permission: account.permission as PrismaResourcePermission,
            },
            update: {
              permission: account.permission as PrismaResourcePermission,
            },
          });

          // 2.3 Registrar auditoria
          await (prisma as PrismaClient).auditLog.create({
            data: {
              userId,
              action: "AUTO_LINK_INVITE",
              resourceType: "ACCOUNT",
              resourceId: account.accountId,
              details: {
                inviteId: invite.id,
                permission: account.permission,
                reason: "Signup auto-link",
              },
            },
          });
        }
      }
    }
  }
}
