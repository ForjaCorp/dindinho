import {
  PrismaClient,
  Prisma,
  Role,
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

class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = "Sem permissão") {
    super(message);
  }
}

class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Não encontrado") {
    super(message);
  }
}

class InternalError extends Error {
  readonly statusCode = 500;
  constructor(message = "Erro interno") {
    super(message);
  }
}

const addMonths = (date: Date, monthsToAdd: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d;
};

const addDays = (date: Date, daysToAdd: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + daysToAdd);
  return d;
};

const addDaysByMs = (date: Date, daysToAdd: number) =>
  new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

const addYears = (date: Date, yearsToAdd: number) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + yearsToAdd);
  return d;
};

const formatInvoiceMonth = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const parseInvoiceMonthToDate = (invoiceMonth: string) => {
  const [y, m] = invoiceMonth.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
};

const parseIsoDayToUtcStartOfDay = (
  value: string,
  tzOffsetMinutes: number | null,
): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const utcStartMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const utcCandidate = new Date(utcStartMs);
  if (
    utcCandidate.getUTCFullYear() !== year ||
    utcCandidate.getUTCMonth() !== month - 1 ||
    utcCandidate.getUTCDate() !== day
  )
    return null;
  const offsetMs =
    typeof tzOffsetMinutes === "number" && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes * 60 * 1000
      : 0;
  return new Date(utcStartMs + offsetMs);
};

const addInvoiceMonths = (invoiceMonth: string, monthsToAdd: number) => {
  const base = parseInvoiceMonthToDate(invoiceMonth);
  return formatInvoiceMonth(addMonths(base, monthsToAdd));
};

const computeInvoiceMonth = (purchaseDate: Date, closingDay: number) => {
  const utcDay = purchaseDate.getUTCDate();
  const base = new Date(
    Date.UTC(
      purchaseDate.getUTCFullYear(),
      purchaseDate.getUTCMonth(),
      1,
      0,
      0,
      0,
    ),
  );
  return formatInvoiceMonth(utcDay > closingDay ? addMonths(base, 1) : base);
};

const toTransactionDTO = (t: Transaction): TransactionDTO => ({
  id: t.id,
  accountId: t.accountId,
  categoryId: t.categoryId ?? null,
  amount: t.amount.toNumber(),
  description: t.description ?? null,
  date: new Date(t.date).toISOString(),
  type: t.type,
  isPaid: t.isPaid,
  transferId: t.transferId ?? null,
  recurrenceId: t.recurrenceId ?? null,
  recurrenceFrequency: t.recurrenceFrequency ?? null,
  recurrenceIntervalDays: t.recurrenceIntervalDays ?? null,
  installmentNumber: t.installmentNumber ?? null,
  totalInstallments: t.totalInstallments ?? null,
  tags: Array.isArray(t.tags) ? (t.tags as string[]) : null,
  purchaseDate: t.purchaseDate ? new Date(t.purchaseDate).toISOString() : null,
  invoiceMonth: t.invoiceMonth ?? null,
  createdAt: new Date(t.createdAt).toISOString(),
  updatedAt: new Date(t.updatedAt).toISOString(),
});

export class TransactionsService {
  private snapshotService: SnapshotService;
  constructor(private prisma: PrismaClient) {
    this.snapshotService = new SnapshotService(prisma);
  }

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
      select: { role: true },
    });

    if (
      !access ||
      (access.role !== Role.EDITOR && access.role !== Role.ADMIN)
    ) {
      throw new ForbiddenError(
        "Sem permissão para lançar transações nesta conta",
      );
    }

    return account;
  }

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
      select: { role: true },
    });

    if (
      !access ||
      (access.role !== Role.EDITOR && access.role !== Role.ADMIN)
    ) {
      throw new ForbiddenError(
        "Sem permissão para lançar transações nesta conta",
      );
    }
  }

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

      if (data.type === "TRANSFER") {
        const destinationAccount = await this.getWritableAccount(
          userId,
          data.destinationAccountId as string,
        );
        this.ensureCreditCardInfo(destinationAccount);

        const transferId = randomUUID();
        const invoiceMonth =
          typeof data.invoiceMonth === "string"
            ? data.invoiceMonth
            : destinationAccount.type === AccountType.CREDIT
              ? computeInvoiceMonth(
                  baseDate,
                  destinationAccount.creditCardInfo!.closingDay,
                )
              : undefined;

        const created = await this.prisma.$transaction(async (tx) => {
          const outTx = await tx.transaction.create({
            data: {
              accountId: originAccount.id,
              categoryId: data.categoryId,
              amount: -Math.abs(data.amount),
              description: data.description,
              date: baseDate,
              type: TransactionType.TRANSFER,
              isPaid: data.isPaid,
              transferId,
              tags,
            },
          });

          const inTx = await tx.transaction.create({
            data: {
              accountId: destinationAccount.id,
              categoryId: data.categoryId,
              amount: Math.abs(data.amount),
              description: data.description,
              date: baseDate,
              type: TransactionType.TRANSFER,
              isPaid: data.isPaid,
              transferId,
              tags,
              ...(destinationAccount.type === AccountType.CREDIT && invoiceMonth
                ? { invoiceMonth }
                : {}),
            },
          });

          if (destinationAccount.type === AccountType.CREDIT && data.isPaid) {
            await tx.transaction.updateMany({
              where: {
                accountId: destinationAccount.id,
                type: TransactionType.EXPENSE,
                isPaid: false,
                invoiceMonth,
              },
              data: { isPaid: true },
            });
          }

          return [outTx, inTx];
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

      if (data.recurrence) {
        const count = data.recurrence.forever
          ? 360
          : (data.recurrence.count as number);
        const freq = data.recurrence
          .frequency as unknown as RecurrenceFrequency;
        const intervalDays =
          data.recurrence.frequency === "CUSTOM"
            ? (data.recurrence.intervalDays as number)
            : null;

        const created = await this.prisma.$transaction(async (tx) => {
          const results: Transaction[] = [];

          for (let i = 1; i <= count; i++) {
            const date =
              data.recurrence!.frequency === "MONTHLY"
                ? addMonths(baseDate, i - 1)
                : data.recurrence!.frequency === "WEEKLY"
                  ? addDays(baseDate, (i - 1) * 7)
                  : data.recurrence!.frequency === "YEARLY"
                    ? addYears(baseDate, i - 1)
                    : addDays(baseDate, (i - 1) * (intervalDays as number));

            const t = await tx.transaction.create({
              data: {
                accountId: originAccount.id,
                categoryId: data.categoryId,
                amount: data.amount,
                description: data.description,
                date,
                type: data.type as TransactionType,
                isPaid: i === 1 ? data.isPaid : false,
                recurrenceId,
                recurrenceFrequency: freq,
                recurrenceIntervalDays: intervalDays,
                installmentNumber: i,
                totalInstallments: count,
                tags,
              },
            });
            results.push(t);
          }

          return results;
        });

        await this.snapshotService.updateSnapshots(originAccount.id, baseDate);

        return created.map(toTransactionDTO);
      }

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

      const totalCents = Math.round(Math.abs(data.amount) * 100);
      const baseCents = Math.floor(totalCents / totalInstallments);
      const installmentsGroupId = randomUUID();
      const firstInvoiceMonth =
        originAccount.type === AccountType.CREDIT
          ? typeof data.invoiceMonth === "string"
            ? data.invoiceMonth
            : computeInvoiceMonth(
                baseDate,
                originAccount.creditCardInfo!.closingDay,
              )
          : null;

      const created = await this.prisma.$transaction(async (tx) => {
        const results: Transaction[] = [];
        for (let i = 1; i <= totalInstallments; i++) {
          const cents =
            i < totalInstallments
              ? baseCents
              : totalCents - baseCents * (totalInstallments - 1);
          const amount = cents / 100;
          const installmentDate = addMonths(baseDate, i - 1);
          const invoiceMonth =
            originAccount.type === AccountType.CREDIT && firstInvoiceMonth
              ? addInvoiceMonths(firstInvoiceMonth, i - 1)
              : null;

          const t = await tx.transaction.create({
            data: {
              accountId: originAccount.id,
              categoryId: data.categoryId,
              amount,
              description: data.description,
              date: installmentDate,
              type: data.type as TransactionType,
              isPaid:
                originAccount.type === AccountType.CREDIT
                  ? false
                  : i === 1
                    ? data.isPaid
                    : false,
              recurrenceId: installmentsGroupId,
              installmentNumber: i,
              totalInstallments,
              tags,
              ...(originAccount.type === AccountType.CREDIT
                ? { purchaseDate: baseDate, invoiceMonth }
                : {}),
            },
          });
          results.push(t);
        }
        return results;
      });

      await this.snapshotService.updateSnapshots(originAccount.id, baseDate);

      return created.map(toTransactionDTO);
    } catch (error) {
      return this.handlePrismaCreateError(error);
    }
  }

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

  async list(
    userId: string,
    input: {
      accountId?: string;
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

    if (accountId) {
      await this.assertCanReadAccount(userId, accountId);
    }

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
      ...(accountId
        ? { accountId }
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
    const minDate = new Date(
      Math.min(...toDelete.filter((d) => d.date).map((d) => d.date.getTime())),
    );

    await this.prisma.transaction.deleteMany({
      where: {
        recurrenceId: tx.recurrenceId as string,
        installmentNumber: { gte: tx.installmentNumber as number },
      },
    });

    await this.snapshotService.updateSnapshots(tx.accountId, minDate);

    return { deletedIds };
  }
}
