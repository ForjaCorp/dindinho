import {
  PrismaClient,
  InviteStatus as PrismaInviteStatus,
  ResourcePermission as PrismaResourcePermission,
  Prisma,
} from "@prisma/client";
import { randomBytes } from "crypto";
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
  constructor(message: string, code = "INVITE_STATUS_ERROR") {
    super(message, code);
  }
}

export class InviteExpiredError extends InviteStatusError {
  constructor() {
    super("Convite expirado", "INVITE_EXPIRED");
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

    // 2. Idempotência: Invalida convites pendentes anteriores para este e-mail que contenham estas contas
    await this.prisma.invite.updateMany({
      where: {
        email: data.email.toLowerCase(),
        status: PrismaInviteStatus.PENDING,
        accounts: {
          some: {
            accountId: { in: data.accounts.map((a) => a.accountId) },
          },
        },
      },
      data: {
        status: PrismaInviteStatus.EXPIRED,
      },
    });

    // 3. Criar o convite e as associações
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));
    const token = randomBytes(32).toString("hex");

    const invite = (await this.prisma.invite.create({
      data: {
        email: data.email.toLowerCase(),
        token,
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
    })) as InviteWithRelations;

    // 4. Registrar auditoria da criação
    await this.logAudit(senderId, "INVITE_CREATED", "USER", data.email, {
      inviteId: invite.id,
      accountCount: data.accounts.length,
    });

    return this.mapToDTO(invite);
  }

  /**
   * Lista convites enviados pelo usuário.
   * @async
   * @param {string} senderId - ID do usuário remetente.
   * @returns {Promise<InviteDTO[]>} Lista de DTOs de convites enviados.
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
   * Lista convites recebidos pelo usuário (baseado no email).
   * @async
   * @param {string} userEmail - E-mail do usuário destinatário.
   * @returns {Promise<InviteDTO[]>} Lista de DTOs de convites recebidos.
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
   * Atualiza o status de um convite (Aceitar/Rejeitar).
   * @async
   * @param {string} userId - ID do usuário que está respondendo.
   * @param {string} userEmail - E-mail do usuário que está respondendo.
   * @param {string} inviteId - ID do convite.
   * @param {UpdateInviteStatusDTO} data - Novos dados de status.
   * @returns {Promise<InviteDTO>} DTO do convite atualizado.
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
      if (invite.status === PrismaInviteStatus.EXPIRED) {
        throw new InviteExpiredError();
      }
      throw new InviteStatusError(
        `Convite já está com status ${invite.status}`,
      );
    }
    if (new Date() > invite.expiresAt) {
      throw new InviteExpiredError();
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
      // 1. Re-validar se o remetente ainda é OWNER das contas
      const validAccounts = await tx.account.findMany({
        where: {
          id: { in: invite.accounts.map((a) => a.accountId) },
          ownerId: invite.senderId,
        },
      });

      if (validAccounts.length !== invite.accounts.length) {
        throw new InvitePermissionError(
          "O remetente original não possui mais permissão sobre uma ou mais contas deste convite",
        );
      }

      // 2. Atualizar status do convite
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

      // 3. Criar entradas no AccountAccess
      for (const a of i.accounts) {
        await tx.accountAccess.upsert({
          where: {
            accountId_userId: {
              accountId: a.accountId,
              userId,
            },
          },
          create: {
            accountId: a.accountId,
            userId,
            permission: a.permission as PrismaResourcePermission,
          },
          update: {
            permission: a.permission as PrismaResourcePermission,
          },
        });

        // 4. Registrar auditoria para cada conta
        await this.logAudit(
          userId,
          "INVITE_ACCEPTED",
          "ACCOUNT",
          a.accountId,
          {
            inviteId,
            permission: a.permission,
            senderId: i.senderId,
          },
          tx,
        );
      }

      return i;
    });

    return this.mapToDTO(updated);
  }

  /**
   * Remove ou cancela um convite enviado.
   * @async
   * @param {string} senderId - ID do usuário remetente que está cancelando.
   * @param {string} inviteId - ID do convite a ser removido.
   * @returns {Promise<void>}
   */
  async deleteInvite(senderId: string, inviteId: string): Promise<void> {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) throw new InviteNotFoundError(inviteId);
    if (invite.senderId !== senderId) throw new InvitePermissionError();

    await this.prisma.$transaction(async (tx) => {
      await tx.invite.delete({
        where: { id: inviteId },
      });

      // Registrar auditoria do cancelamento
      await this.logAudit(
        senderId,
        "INVITE_REVOKED",
        "USER",
        invite.email,
        {
          inviteId,
        },
        tx,
      );
    });
  }

  /**
   * Busca um convite pelo seu token de segurança.
   * @async
   * @param {string} token - Token do convite.
   * @returns {Promise<InviteDTO>} DTO do convite encontrado.
   * @throws {InviteNotFoundError} Se o convite não existir.
   * @throws {InviteExpiredError} Se o convite estiver expirado.
   */
  async getInviteByToken(token: string): Promise<InviteDTO> {
    const invite = (await this.prisma.invite.findUnique({
      where: { token },
      include: {
        sender: { select: { id: true, name: true } },
        accounts: {
          include: { account: { select: { name: true } } },
        },
      },
    })) as InviteWithRelations | null;

    if (!invite) throw new InviteNotFoundError(token);

    if (
      invite.status === PrismaInviteStatus.EXPIRED ||
      new Date() > invite.expiresAt
    ) {
      throw new InviteExpiredError();
    }

    return this.mapToDTO(invite);
  }

  /**
   * Remove convites expirados ou rejeitados há mais de X dias.
   * @async
   * @description Realiza a limpeza periódica da tabela de convites.
   * @param {number} [daysOld=30] - Número de dias para considerar um convite antigo.
   * @returns {Promise<number>} Quantidade de convites removidos.
   */
  async cleanupExpiredInvites(daysOld = 30): Promise<number> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysOld);

    const result = await this.prisma.invite.deleteMany({
      where: {
        OR: [
          { status: PrismaInviteStatus.EXPIRED },
          { status: PrismaInviteStatus.REJECTED },
          {
            status: PrismaInviteStatus.PENDING,
            expiresAt: { lt: new Date() },
          },
        ],
        createdAt: { lt: threshold },
      },
    });

    return result.count;
  }

  /**
   * Converte o modelo do Prisma com relações para um DTO de convite.
   * @private
   * @param {InviteWithRelations} invite - Modelo do Prisma carregado com relações.
   * @returns {InviteDTO} DTO formatado para a API.
   */
  private mapToDTO(invite: InviteWithRelations): InviteDTO {
    return {
      id: invite.id,
      token: invite.token,
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

  /**
   * Registra um evento de auditoria no sistema.
   * @private
   * @async
   * @param {string} userId - ID do usuário que realizou a ação.
   * @param {string} action - Nome da ação realizada.
   * @param {string} resourceType - Tipo de recurso afetado.
   * @param {string} resourceId - ID do recurso afetado.
   * @param {Record<string, unknown>} [details] - Detalhes adicionais em JSON.
   * @param {Prisma.TransactionClient} [tx] - Cliente de transação opcional.
   */
  private async logAudit(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (tx) {
      await tx.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          details: (details as Prisma.InputJsonValue) || Prisma.JsonNull,
        },
      });
    } else {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          details: (details as Prisma.InputJsonValue) || Prisma.JsonNull,
        },
      });
    }
  }
}
