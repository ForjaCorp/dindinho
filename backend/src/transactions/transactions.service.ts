import {
  PrismaClient,
  Prisma,
  ResourcePermission,
  TransactionType,
  AccountType,
  RecurrenceFrequency,
  Transaction,
  CreditCardInfo,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  CreateTransactionDTO,
  DeleteTransactionScopeDTO,
  TransactionDTO,
  UpdateTransactionDTO,
  UpdateTransactionScopeDTO,
} from "@dindinho/shared";
import { SnapshotService } from "../reports/snapshot.service";
import { ForbiddenError, NotFoundError } from "../lib/domain-exceptions";
import { InstallmentsService } from "./installments.service";
import { RecurrenceService } from "./recurrence.service";
import { TransfersService } from "./transfers.service";
import {
  computeInvoiceMonth,
  addInvoiceMonths,
  addMonths,
  addDaysByMs,
  parseIsoDayToUtcStartOfDay,
  parseInvoiceMonthToDate,
  toTransactionDTO,
} from "./transactions.utils";

class InternalError extends Error {
  readonly statusCode = 500;
  constructor(message = "Erro interno") {
    super(message);
  }
}

/**
 * Serviço responsável pela lógica de negócio de transações
 * @class TransactionsService
 * @description Gerencia operações de criação, listagem, atualização e exclusão de transações e transferências
 */
export class TransactionsService {
  private snapshotService: SnapshotService;
  private installmentsService: InstallmentsService;
  private recurrenceService: RecurrenceService;
  private transfersService: TransfersService;

  constructor(private prisma: PrismaClient) {
    this.snapshotService = new SnapshotService(prisma);
    this.installmentsService = new InstallmentsService();
    this.recurrenceService = new RecurrenceService();
    this.transfersService = new TransfersService();
  }

  /**
   * Garante que uma conta do tipo cartão de crédito possua informações de fatura
   * @private
   * @param {Object} account - Dados da conta a serem validados
   * @throws {InternalError} Caso a conta seja de crédito mas não possua closingDay
   */
  private ensureCreditCardInfo(account: {
    type: AccountType;
    creditCardInfo: CreditCardInfo | null;
  }) {
    if (account.type !== AccountType.CREDIT) return;
    if (
      !account.creditCardInfo ||
      typeof account.creditCardInfo.closingDay !== "number"
    ) {
      throw new InternalError("Cartão de crédito sem dados de fatura");
    }
  }

  /**
   * Trata erros conhecidos do Prisma durante a criação de registros
   * @private
   * @param {unknown} error - Erro capturado
   * @throws {NotFoundError} Caso algum recurso relacionado não seja encontrado
   * @throws {unknown} Caso seja um erro não mapeado
   */
  private handlePrismaCreateError(error: unknown): never {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        const field =
          error.meta && typeof error.meta.field_name === "string"
            ? error.meta.field_name
            : "";
        const normalized = field.toLowerCase();
        if (normalized.includes("category")) {
          throw new NotFoundError("Categoria não encontrada");
        }
        if (normalized.includes("account")) {
          throw new NotFoundError("Conta não encontrada");
        }
        throw new NotFoundError("Recurso relacionado não encontrado");
      }

      if (error.code === "P2025") {
        throw new NotFoundError("Registro não encontrado");
      }
    }

    throw error;
  }

  /**
   * Busca uma conta e valida se o usuário tem permissão de escrita (EDITOR ou ADMIN)
   * @private
   * @async
   * @param {string} userId - ID do usuário realizando a operação
   * @param {string} accountId - ID da conta alvo
   * @returns {Promise<Account>} Dados da conta com informações de cartão de crédito
   * @throws {NotFoundError} Caso a conta não exista
   * @throws {ForbiddenError} Caso o usuário não tenha permissão de escrita
   */
  private async getWritableAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { creditCardInfo: true },
    });

    if (!account) {
      throw new NotFoundError("Conta não encontrada");
    }

    if (account.ownerId === userId) return account;

    const access = await this.prisma.accountAccess.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
      select: { permission: true },
    });

    if (
      !access ||
      (access.permission !== ResourcePermission.EDITOR &&
        access.permission !== ResourcePermission.OWNER)
    ) {
      throw new ForbiddenError(
        "Sem permissão para lançar transações nesta conta",
      );
    }

    return account;
  }

  /**
   * Valida se o usuário tem permissão de leitura em uma conta
   * @private
   * @async
   * @param {string} userId - ID do usuário
   * @param {string} accountId - ID da conta
   * @throws {ForbiddenError} Caso o usuário não tenha acesso à conta
   */
  private async assertCanReadAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        OR: [
          { ownerId: userId },
          {
            accessList: {
              some: { userId },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!account) {
      throw new ForbiddenError("Sem permissão para acessar esta conta");
    }
  }

  /**
   * Valida se o usuário tem permissão de escrita em uma conta
   * @private
   * @async
   * @param {string} userId - ID do usuário
   * @param {string} accountId - ID da conta
   * @throws {NotFoundError} Caso a conta não exista
   * @throws {ForbiddenError} Caso o usuário não tenha permissão de escrita
   */
  private async assertCanWriteAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, ownerId: true },
    });

    if (!account) {
      throw new NotFoundError("Conta não encontrada");
    }

    if (account.ownerId === userId) return;

    const access = await this.prisma.accountAccess.findUnique({
      where: {
        accountId_userId: {
          accountId,
          userId,
        },
      },
      select: { permission: true },
    });

    if (
      !access ||
      (access.permission !== ResourcePermission.EDITOR &&
        access.permission !== ResourcePermission.OWNER)
    ) {
      throw new ForbiddenError(
        "Sem permissão para lançar transações nesta conta",
      );
    }
  }

  /**
   * Valida se o usuário tem permissão para usar uma categoria específica
   * @private
   * @async
   * @param {string} userId - ID do usuário
   * @param {string} categoryId - ID da categoria
   * @throws {NotFoundError} Caso a categoria não exista
   * @throws {ForbiddenError} Caso a categoria pertença a outro usuário
   */
  private async assertCategoryAccess(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, userId: true },
    });
    if (!category) throw new NotFoundError("Categoria não encontrada");
    if (category.userId !== null && category.userId !== userId) {
      throw new ForbiddenError("Sem permissão para usar esta categoria");
    }
  }

  /**
   * Cria uma nova transação, transferência, parcelamento ou recorrência
   * @async
   * @param {string} userId - ID do usuário criando a transação
   * @param {CreateTransactionDTO} data - Dados da transação
   * @returns {Promise<TransactionDTO | TransactionDTO[]>} Transação criada ou lista de transações (em caso de parcelamento/recorrência/transferência)
   * @throws {ForbiddenError} Em caso de regras de negócio violadas
   * @throws {NotFoundError} Caso conta ou categoria não existam
   */
  async create(
    userId: string,
    data: CreateTransactionDTO,
  ): Promise<TransactionDTO | TransactionDTO[]> {
    try {
      const originAccount = await this.getWritableAccount(
        userId,
        data.accountId,
      );
      this.ensureCreditCardInfo(originAccount);

      await this.assertCategoryAccess(userId, data.categoryId);

      const baseDate = data.date ? new Date(data.date) : new Date();
      const tags = data.tags && data.tags.length ? data.tags : undefined;

      // DELGADO: Transfer Logic
      if (data.type === "TRANSFER") {
        const destinationAccount = await this.getWritableAccount(
          userId,
          data.destinationAccountId as string,
        );
        this.ensureCreditCardInfo(destinationAccount);

        const created = await this.prisma.$transaction(async (tx) => {
          return this.transfersService.createTransfer(
            tx,
            originAccount,
            destinationAccount,
            baseDate,
            data,
            tags,
          );
        });

        await this.snapshotService.updateSnapshots(originAccount.id, baseDate);
        await this.snapshotService.updateSnapshots(
          destinationAccount.id,
          baseDate,
        );

        return created.map(toTransactionDTO);
      }

      if (originAccount.type === AccountType.CREDIT && data.recurrence) {
        throw new ForbiddenError(
          "Recorrência não é permitida em cartão de crédito",
        );
      }

      const totalInstallments = data.totalInstallments ?? 1;
      const recurrenceId = data.recurrence ? randomUUID() : null;

      // DELEGADO: Recurrence Logic
      if (data.recurrence) {
        const created = await this.prisma.$transaction(async (tx) => {
          return this.recurrenceService.createRecurring(
            tx,
            originAccount.id,
            originAccount.type,
            baseDate,
            data,
            recurrenceId!,
            tags,
          );
        });

        await this.snapshotService.updateSnapshots(originAccount.id, baseDate);
        return created.map(toTransactionDTO);
      }

      // DELEGADO: Simple Transaction
      if (totalInstallments <= 1) {
        const invoiceMonth =
          originAccount.type === AccountType.CREDIT
            ? typeof data.invoiceMonth === "string"
              ? data.invoiceMonth
              : computeInvoiceMonth(
                  baseDate,
                  originAccount.creditCardInfo!.closingDay,
                )
            : null;

        const created = await this.prisma.transaction.create({
          data: {
            accountId: originAccount.id,
            categoryId: data.categoryId,
            amount: data.amount,
            description: data.description,
            date: baseDate,
            type: data.type as TransactionType,
            isPaid:
              originAccount.type === AccountType.CREDIT ? false : data.isPaid,
            tags,
            ...(originAccount.type === AccountType.CREDIT
              ? { purchaseDate: baseDate, invoiceMonth }
              : {}),
          },
        });

        await this.snapshotService.updateSnapshots(originAccount.id, baseDate);
        return toTransactionDTO(created);
      }

      // DELEGADO: Installments Logic
      const installmentsGroupId = randomUUID();
      const created = await this.prisma.$transaction(async (tx) => {
        return this.installmentsService.createInstallments(
          tx,
          originAccount.id,
          originAccount.type,
          originAccount.creditCardInfo?.closingDay ?? null,
          baseDate,
          data,
          installmentsGroupId,
          tags,
        );
      });

      await this.snapshotService.updateSnapshots(originAccount.id, baseDate);

      return created.map(toTransactionDTO);
    } catch (error) {
      console.error("CREATE ERROR:", error);
      return this.handlePrismaCreateError(error);
    }
  }

  /**
   * Lista transações de uma conta específica em um intervalo de tempo (Legado)
   * @async
   * @param {string} userId - ID do usuário
   * @param {Object} input - Filtros de conta e data
   * @param {string} input.accountId - ID da conta
   * @param {string} [input.from] - Data inicial (ISO)
   * @param {string} [input.to] - Data final (ISO)
   * @returns {Promise<TransactionDTO[]>} Lista de transações encontradas
   */
  async listByAccount(
    userId: string,
    input: { accountId: string; from?: string; to?: string },
  ): Promise<TransactionDTO[]> {
    await this.assertCanReadAccount(userId, input.accountId);

    const from = input.from ? new Date(input.from) : undefined;
    const to = input.to ? new Date(input.to) : undefined;

    const dateFilter =
      from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {};

    const txs = await this.prisma.transaction.findMany({
      where: {
        accountId: input.accountId,
        ...dateFilter,
      },
      orderBy: { date: "desc" },
    });

    return txs.map(toTransactionDTO);
  }

  /**
   * Lista transações com filtros avançados e paginação por cursor
   * @async
   * @param {string} userId - ID do usuário
   * @param {Object} input - Parâmetros de filtro e paginação
   * @returns {Promise<{ items: TransactionDTO[]; nextCursorId: string | null }>} Lista paginada de transações
   * @throws {ForbiddenError} Caso o usuário tente acessar contas sem permissão
   */
  async list(
    userId: string,
    input: {
      accountId?: string;
      accountIds?: string[];
      categoryId?: string;
      from?: string;
      to?: string;
      startDay?: string;
      endDay?: string;
      tzOffsetMinutes?: number;
      invoiceMonth?: string;
      q?: string;
      type?: "INCOME" | "EXPENSE" | "TRANSFER";
      limit?: number;
      cursorId?: string;
    },
  ): Promise<{ items: TransactionDTO[]; nextCursorId: string | null }> {
    const accountId =
      typeof input.accountId === "string" ? input.accountId : undefined;
    const categoryId =
      typeof input.categoryId === "string" ? input.categoryId : undefined;
    const accountIds =
      Array.isArray(input.accountIds) && input.accountIds.length > 0
        ? input.accountIds
        : undefined;
    const targetAccountIds =
      accountIds ?? (accountId ? [accountId] : undefined);

    if (targetAccountIds) {
      const count = await this.prisma.account.count({
        where: {
          id: { in: targetAccountIds },
          OR: [{ ownerId: userId }, { accessList: { some: { userId } } }],
        },
      });

      if (count !== targetAccountIds.length) {
        throw new ForbiddenError(
          "Sem permissão para acessar uma ou mais contas solicitadas",
        );
      }
    }
    const invoiceMonth =
      typeof input.invoiceMonth === "string" ? input.invoiceMonth : undefined;
    const startDayRaw =
      typeof input.startDay === "string" ? input.startDay : undefined;
    const endDayRaw =
      typeof input.endDay === "string" ? input.endDay : undefined;
    const tzOffsetMinutes =
      typeof input.tzOffsetMinutes === "number" &&
      Number.isFinite(input.tzOffsetMinutes)
        ? input.tzOffsetMinutes
        : null;

    const hasDayRange = !!startDayRaw || !!endDayRaw;

    const from =
      !invoiceMonth && !hasDayRange && input.from
        ? new Date(input.from)
        : undefined;
    const to =
      !invoiceMonth && !hasDayRange && input.to
        ? new Date(input.to)
        : undefined;
    const limit = typeof input.limit === "number" ? input.limit : 30;
    const cursorId =
      typeof input.cursorId === "string" ? input.cursorId : undefined;
    const q = typeof input.q === "string" ? input.q.trim() : "";
    const type = input.type;

    const startDay = startDayRaw
      ? parseIsoDayToUtcStartOfDay(startDayRaw, tzOffsetMinutes)
      : null;
    const endDay = endDayRaw
      ? parseIsoDayToUtcStartOfDay(endDayRaw, tzOffsetMinutes)
      : null;

    const normalizedStartDay = startDay ?? endDay;
    const normalizedEndDay = endDay ?? startDay;

    const dayRangeFilter: Prisma.TransactionWhereInput =
      !invoiceMonth && normalizedStartDay && normalizedEndDay
        ? normalizedStartDay.getTime() <= normalizedEndDay.getTime()
          ? {
              date: {
                gte: normalizedStartDay,
                lt: addDaysByMs(normalizedEndDay, 1),
              },
            }
          : {
              date: {
                gte: normalizedEndDay,
                lt: addDaysByMs(normalizedStartDay, 1),
              },
            }
        : {};

    const legacyRangeFilter: Prisma.TransactionWhereInput =
      !invoiceMonth && (from || to)
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {};

    const invoiceMonthStart = invoiceMonth
      ? parseInvoiceMonthToDate(invoiceMonth)
      : null;
    const invoiceMonthEnd = invoiceMonthStart
      ? new Date(
          Date.UTC(
            invoiceMonthStart.getUTCFullYear(),
            invoiceMonthStart.getUTCMonth() + 1,
            1,
            0,
            0,
            0,
            0,
          ),
        )
      : null;

    const invoiceMonthFilter: Prisma.TransactionWhereInput = invoiceMonth
      ? {
          OR: [
            { invoiceMonth },
            {
              AND: [
                { invoiceMonth: null },
                {
                  date: {
                    gte: invoiceMonthStart!,
                    lt: invoiceMonthEnd!,
                  },
                },
              ],
            },
          ],
        }
      : {};

    const where: Prisma.TransactionWhereInput = {
      ...(targetAccountIds
        ? { accountId: { in: targetAccountIds } }
        : {
            account: {
              OR: [
                { ownerId: userId },
                {
                  accessList: {
                    some: { userId },
                  },
                },
              ],
            },
          }),
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            description: {
              contains: q,
            },
          }
        : {}),
      ...(type ? { type: type as TransactionType } : {}),
      ...invoiceMonthFilter,
      ...dayRangeFilter,
      ...legacyRangeFilter,
    };

    const txs = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: limit,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1,
          }
        : {}),
    });

    const items = txs.map(toTransactionDTO);
    const nextCursorId =
      items.length === limit ? items[items.length - 1]!.id : null;
    return { items, nextCursorId };
  }

  /**
   * Busca os detalhes de uma transação específica por ID
   * @async
   * @param {string} userId - ID do usuário
   * @param {string} id - ID da transação
   * @returns {Promise<TransactionDTO>} Dados da transação
   * @throws {NotFoundError} Caso a transação não exista ou o usuário não tenha acesso
   */
  async getById(userId: string, id: string): Promise<TransactionDTO> {
    const tx = await this.prisma.transaction.findFirst({
      where: {
        id,
        account: {
          OR: [
            { ownerId: userId },
            {
              accessList: {
                some: { userId },
              },
            },
          ],
        },
      },
    });

    if (!tx) throw new NotFoundError("Transação não encontrada");
    return toTransactionDTO(tx);
  }

  /**
   * Atualiza uma transação ou série de transações (recorrência/parcelamento)
   * @async
   * @param {string} userId - ID do usuário realizando a atualização
   * @param {string} id - ID da transação base
   * @param {UpdateTransactionDTO} data - Novos dados da transação
   * @param {UpdateTransactionScopeDTO} [scope="ONE"] - Escopo da atualização (única, futuras ou todas)
   * @returns {Promise<TransactionDTO>} Transação atualizada
   * @throws {NotFoundError} Caso a transação não exista
   * @throws {ForbiddenError} Caso o usuário não tenha permissão de escrita
   */
  async update(
    userId: string,
    id: string,
    data: UpdateTransactionDTO,
    scope: UpdateTransactionScopeDTO = "ONE",
  ): Promise<TransactionDTO> {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        accountId: true,
        type: true,
        transferId: true,
        recurrenceId: true,
        installmentNumber: true,
        date: true,
      },
    });

    if (!existing) throw new NotFoundError("Transação não encontrada");
    await this.assertCanWriteAccount(userId, existing.accountId);

    if (data.categoryId !== undefined && data.categoryId !== null) {
      await this.assertCategoryAccess(userId, data.categoryId);
    }

    const nextDate = typeof data.date === "string" ? new Date(data.date) : null;

    const baseUpdate: Prisma.TransactionUpdateInput = {
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.isPaid !== undefined ? { isPaid: data.isPaid } : {}),
    };

    if (existing.type === TransactionType.TRANSFER && existing.transferId) {
      const pair = await this.prisma.transaction.findMany({
        where: { transferId: existing.transferId },
        select: {
          id: true,
          accountId: true,
          type: true,
        },
      });

      const byId = new Map<string, { accountId: string }>();
      for (const t of pair) {
        if (t.type === TransactionType.TRANSFER) {
          byId.set(t.id, { accountId: t.accountId });
        }
      }

      const accountIds = [...new Set(pair.map((t) => t.accountId))];

      // Valida permissão de escrita em todas as contas envolvidas na transferência
      for (const accId of accountIds) {
        await this.assertCanWriteAccount(userId, accId);
      }

      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds } },
        include: { creditCardInfo: true },
      });

      const accountById = new Map<string, (typeof accounts)[number]>();
      for (const a of accounts) accountById.set(a.id, a);

      await this.prisma.$transaction(async (tx) => {
        for (const t of byId.keys()) {
          const accountId = byId.get(t)!.accountId;
          const account = accountById.get(accountId) ?? null;

          const dateFields: Prisma.TransactionUpdateInput = {};
          if (nextDate) {
            if (account?.type === AccountType.CREDIT) {
              this.ensureCreditCardInfo(account);
              dateFields.date = nextDate;
              dateFields.purchaseDate = nextDate;
              dateFields.invoiceMonth = computeInvoiceMonth(
                nextDate,
                account.creditCardInfo!.closingDay,
              );
            } else {
              dateFields.date = nextDate;
            }
          }

          await tx.transaction.update({
            where: { id: t },
            data: {
              ...baseUpdate,
              ...dateFields,
            },
          });
        }
      });

      // Recalcula snapshots para ambas as contas envolvidas na transferência
      const affectedDates = [existing.date];
      if (nextDate) affectedDates.push(nextDate);
      const minDate = new Date(
        Math.min(...affectedDates.filter(Boolean).map((d) => d!.getTime())),
      );

      for (const accId of accountIds) {
        await this.snapshotService.updateSnapshots(accId, minDate);
      }

      return this.getById(userId, id);
    }

    const hasSeries =
      typeof existing.recurrenceId === "string" &&
      typeof existing.installmentNumber === "number";

    if (hasSeries && scope !== "ONE") {
      const recurrenceId = existing.recurrenceId as string;
      const installmentNumber = existing.installmentNumber as number;

      const seriesWhere: Prisma.TransactionWhereInput =
        scope === "ALL"
          ? { recurrenceId }
          : {
              recurrenceId,
              installmentNumber: { gte: installmentNumber },
            };

      if (!nextDate) {
        await this.prisma.transaction.updateMany({
          where: seriesWhere,
          data: baseUpdate,
        });
        return this.getById(userId, id);
      }

      const deltaMs = nextDate.getTime() - new Date(existing.date).getTime();
      const affected = await this.prisma.transaction.findMany({
        where: seriesWhere,
        select: { id: true, date: true },
      });

      const account = await this.prisma.account.findUnique({
        where: { id: existing.accountId },
        include: { creditCardInfo: true },
      });

      const isCredit = account?.type === AccountType.CREDIT;
      if (isCredit) this.ensureCreditCardInfo(account!);

      await this.prisma.$transaction(async (tx) => {
        for (const item of affected) {
          const shiftedDate = new Date(item.date.getTime() + deltaMs);
          const dateFields: Prisma.TransactionUpdateInput = isCredit
            ? {
                date: shiftedDate,
                purchaseDate: shiftedDate,
                invoiceMonth: computeInvoiceMonth(
                  shiftedDate,
                  account!.creditCardInfo!.closingDay,
                ),
              }
            : { date: shiftedDate };

          await tx.transaction.update({
            where: { id: item.id },
            data: {
              ...baseUpdate,
              ...dateFields,
            },
          });
        }
      });

      const affectedDates = [existing.date, ...affected.map((a) => a.date)];
      if (nextDate) affectedDates.push(nextDate);
      const minDate = new Date(
        Math.min(...affectedDates.filter(Boolean).map((d) => d!.getTime())),
      );
      await this.snapshotService.updateSnapshots(existing.accountId, minDate);

      return this.getById(userId, id);
    }

    if (nextDate) {
      const account = await this.prisma.account.findUnique({
        where: { id: existing.accountId },
        include: { creditCardInfo: true },
      });
      if (account?.type === AccountType.CREDIT) {
        this.ensureCreditCardInfo(account);
        baseUpdate.purchaseDate = nextDate;
        baseUpdate.invoiceMonth = computeInvoiceMonth(
          nextDate,
          account.creditCardInfo!.closingDay,
        );
      }

      baseUpdate.date = nextDate;
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: baseUpdate,
    });

    const affectedDates = [existing.date];
    if (nextDate) affectedDates.push(nextDate);
    const minDate = new Date(
      Math.min(...affectedDates.filter(Boolean).map((d) => d!.getTime())),
    );
    await this.snapshotService.updateSnapshots(existing.accountId, minDate);

    return toTransactionDTO(updated);
  }

  /**
   * Exclui uma transação ou série de transações (recorrência/parcelamento)
   * @async
   * @param {string} userId - ID do usuário realizando a exclusão
   * @param {string} id - ID da transação base
   * @param {DeleteTransactionScopeDTO} scope - Escopo da exclusão (única, futuras ou todas)
   * @returns {Promise<{ deletedIds: string[] }>} Lista de IDs excluídos
   * @throws {NotFoundError} Caso a transação não exista
   * @throws {ForbiddenError} Caso o usuário não tenha permissão de escrita
   */
  async delete(
    userId: string,
    id: string,
    scope: DeleteTransactionScopeDTO,
  ): Promise<{ deletedIds: string[] }> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        accountId: true,
        transferId: true,
        recurrenceId: true,
        installmentNumber: true,
      },
    });

    if (!tx) throw new NotFoundError("Transação não encontrada");
    await this.assertCanWriteAccount(userId, tx.accountId);

    if (tx.transferId) {
      const toDelete = await this.prisma.transaction.findMany({
        where: { transferId: tx.transferId },
        select: { id: true, accountId: true, date: true },
      });
      const deletedIds = toDelete.map((t) => t.id);
      const accountIds = [...new Set(toDelete.map((t) => t.accountId))];

      // Valida permissão de escrita em todas as contas envolvidas na transferência
      for (const accId of accountIds) {
        await this.assertCanWriteAccount(userId, accId);
      }

      await this.prisma.transaction.deleteMany({
        where: { transferId: tx.transferId },
      });

      // Atualiza snapshots para cada conta afetada
      for (const item of toDelete) {
        await this.snapshotService.updateSnapshots(item.accountId, item.date);
      }

      return { deletedIds };
    }

    const hasSeries =
      typeof tx.recurrenceId === "string" &&
      typeof tx.installmentNumber === "number";

    if (!hasSeries || scope === "ONE") {
      const deleted = await this.prisma.transaction.findUnique({
        where: { id: tx.id },
        select: { date: true },
      });
      await this.prisma.transaction.delete({ where: { id: tx.id } });
      if (deleted) {
        await this.snapshotService.updateSnapshots(tx.accountId, deleted.date);
      }
      return { deletedIds: [tx.id] };
    }

    if (scope === "ALL") {
      const toDelete = await this.prisma.transaction.findMany({
        where: { recurrenceId: tx.recurrenceId as string },
        select: { id: true, date: true },
      });
      const deletedIds = toDelete.map((t) => t.id);
      const minDate = new Date(
        Math.min(
          ...toDelete.filter((d) => d.date).map((d) => d.date.getTime()),
        ),
      );

      await this.prisma.transaction.deleteMany({
        where: { recurrenceId: tx.recurrenceId as string },
      });

      await this.snapshotService.updateSnapshots(tx.accountId, minDate);

      return { deletedIds };
    }

    const toDelete = await this.prisma.transaction.findMany({
      where: {
        recurrenceId: tx.recurrenceId as string,
        installmentNumber: { gte: tx.installmentNumber as number },
      },
      select: { id: true, date: true },
    });
    const deletedIds = toDelete.map((t) => t.id);
    if (toDelete.length === 0) {
      return { deletedIds: [] };
    }
    const minDate = new Date(
      Math.min(...toDelete.map((d) => d.date.getTime())),
    );

    await this.prisma.transaction.deleteMany({
      where: {
        id: { in: deletedIds },
      },
    });

    await this.snapshotService.updateSnapshots(tx.accountId, minDate);

    return { deletedIds };
  }
}
