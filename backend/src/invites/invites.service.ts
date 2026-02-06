import {
  PrismaClient,
  InviteStatus as PrismaInviteStatus,
  ResourcePermission as PrismaResourcePermission,
  Prisma,
} from "@prisma/client";
import {
  CreateInviteDTO,
  InviteDTO,
  UpdateInviteStatusDTO,
  InviteStatus,
  ResourcePermission,
} from "@dindinho/shared";

export type InviteWithRelations = Prisma.InviteGetPayload<{
  include: {
    sender: { select: { id: true; name: true } };
    accounts: {
      include: { account: { select: { name: true } } };
    };
  };
}>;

/**
 * Erro base para operações de convite.
 */
export abstract class InviteError extends Error {
  abstract readonly statusCode: number;
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InviteNotFoundError extends InviteError {
  readonly statusCode = 404;
  constructor(_inviteId: string) {
    super("Convite não encontrado", "INVITE_NOT_FOUND");
  }
}

export class InvitePermissionError extends InviteError {
  readonly statusCode = 403;
  constructor(message = "Sem permissão para realizar esta ação") {
    super(message, "INVITE_PERMISSION_DENIED");
  }
}

export class InviteStatusError extends InviteError {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message, "INVITE_STATUS_ERROR");
  }
}

/**
 * Serviço responsável pela gestão de convites de compartilhamento de conta
 * @class InvitesService
 */
export class InvitesService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria um novo convite para um email
   * @async
   * @param {string} senderId - ID do usuário que está enviando
   * @param {CreateInviteDTO} data - Dados do convite
   */
  async createInvite(
    senderId: string,
    data: CreateInviteDTO,
  ): Promise<InviteDTO> {
    // 0. Impedir auto-convite
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { email: true },
    });

    if (sender?.email === data.email.toLowerCase()) {
      throw new InvitePermissionError("Você não pode convidar a si mesmo");
    }

    // 1. Validar se o remetente é OWNER de todas as contas que está convidando
    const accounts = await this.prisma.account.findMany({
      where: {
        id: { in: data.accounts.map((a) => a.accountId) },
        ownerId: senderId,
      },
    });

    if (accounts.length !== data.accounts.length) {
      throw new InvitePermissionError(
        "Você só pode convidar pessoas para contas das quais é proprietário",
      );
    }

    // 2. Criar o convite e as associações
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    const invite = await this.prisma.invite.create({
      data: {
        email: data.email.toLowerCase(),
        senderId,
        status: PrismaInviteStatus.PENDING,
        expiresAt,
        accounts: {
          create: data.accounts.map((a) => ({
            accountId: a.accountId,
            permission: a.permission as PrismaResourcePermission,
          })),
        },
      },
      include: {
        sender: { select: { id: true, name: true } },
        accounts: {
          include: { account: { select: { name: true } } },
        },
      },
    });

    return this.mapToDTO(invite);
  }

  /**
   * Lista convites enviados pelo usuário
   */
  async listSentInvites(senderId: string): Promise<InviteDTO[]> {
    const invites = await this.prisma.invite.findMany({
      where: { senderId },
      include: {
        sender: { select: { id: true, name: true } },
        accounts: {
          include: { account: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invites.map((i) => this.mapToDTO(i));
  }

  /**
   * Lista convites recebidos pelo usuário (baseado no email)
   */
  async listReceivedInvites(userEmail: string): Promise<InviteDTO[]> {
    const invites = await this.prisma.invite.findMany({
      where: { email: userEmail.toLowerCase() },
      include: {
        sender: { select: { id: true, name: true } },
        accounts: {
          include: { account: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invites.map((i) => this.mapToDTO(i));
  }

  /**
   * Atualiza o status de um convite (Aceitar/Rejeitar)
   * @async
   */
  async updateInviteStatus(
    userId: string,
    userEmail: string,
    inviteId: string,
    data: UpdateInviteStatusDTO,
  ): Promise<InviteDTO> {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: { accounts: true },
    });

    if (!invite) throw new InviteNotFoundError(inviteId);
    if (invite.email !== userEmail.toLowerCase())
      throw new InvitePermissionError();
    if (invite.status !== PrismaInviteStatus.PENDING) {
      throw new InviteStatusError(
        `Convite já está com status ${invite.status}`,
      );
    }
    if (new Date() > invite.expiresAt) {
      // Opcional: atualizar para EXPIRED aqui
      throw new InviteStatusError("Convite expirado");
    }

    if (data.status === InviteStatus.REJECTED) {
      const updated = await this.prisma.invite.update({
        where: { id: inviteId },
        data: { status: PrismaInviteStatus.REJECTED },
        include: {
          sender: { select: { id: true, name: true } },
          accounts: {
            include: { account: { select: { name: true } } },
          },
        },
      });
      return this.mapToDTO(updated);
    }

    // Se ACCEPTED, realizar transação atômica
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Atualizar status do convite
      const i = await tx.invite.update({
        where: { id: inviteId },
        data: { status: PrismaInviteStatus.ACCEPTED },
        include: {
          sender: { select: { id: true, name: true } },
          accounts: {
            include: { account: { select: { name: true } } },
          },
        },
      });

      // 2. Criar entradas no AccountAccess
      await tx.accountAccess.createMany({
        data: i.accounts.map((a) => ({
          accountId: a.accountId,
          userId,
          permission: a.permission as PrismaResourcePermission,
        })),
        skipDuplicates: true, // Caso já tenha acesso por outro convite
      });

      return i;
    });

    return this.mapToDTO(updated);
  }

  /**
   * Remove/Cancela um convite enviado
   */
  async deleteInvite(senderId: string, inviteId: string): Promise<void> {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) throw new InviteNotFoundError(inviteId);
    if (invite.senderId !== senderId) throw new InvitePermissionError();

    await this.prisma.invite.delete({
      where: { id: inviteId },
    });
  }

  /**
   * Helper para mapear o modelo do Prisma para o DTO do shared
   * @private
   */
  private mapToDTO(invite: InviteWithRelations): InviteDTO {
    return {
      id: invite.id,
      email: invite.email,
      sender: {
        id: invite.sender.id,
        name: invite.sender.name,
      },
      status: invite.status as unknown as InviteStatus,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      accounts: invite.accounts.map((a) => ({
        accountId: a.accountId,
        accountName: a.account.name,
        permission: a.permission as unknown as ResourcePermission,
      })),
    };
  }
}
