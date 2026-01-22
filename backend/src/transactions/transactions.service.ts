import {
  PrismaClient,
  Prisma,
  Role,
  TransactionType,
  WalletType,
  RecurrenceFrequency,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { CreateTransactionDTO, TransactionDTO } from "@dindinho/shared";

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

const toTransactionDTO = (t: any): TransactionDTO => ({
  id: t.id,
  walletId: t.walletId,
  categoryId: t.categoryId ?? null,
  amount:
    typeof t.amount?.toNumber === "function" ? t.amount.toNumber() : t.amount,
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
  tags: Array.isArray(t.tags) ? t.tags : (t.tags ?? null),
  purchaseDate: t.purchaseDate ? new Date(t.purchaseDate).toISOString() : null,
  invoiceMonth: t.invoiceMonth ?? null,
  createdAt: new Date(t.createdAt).toISOString(),
  updatedAt: new Date(t.updatedAt).toISOString(),
});

export class TransactionsService {
  constructor(private prisma: PrismaClient) {}

  private ensureCreditCardInfo(wallet: {
    type: WalletType;
    creditCardInfo: any | null;
  }) {
    if (wallet.type !== WalletType.CREDIT) return;
    if (
      !wallet.creditCardInfo ||
      typeof wallet.creditCardInfo.closingDay !== "number"
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
          typeof (error as any).meta?.field_name === "string"
            ? (error as any).meta.field_name
            : "";
        const normalized = field.toLowerCase();
        if (normalized.includes("category")) {
          throw new NotFoundError("Categoria não encontrada");
        }
        if (normalized.includes("wallet")) {
          throw new NotFoundError("Carteira não encontrada");
        }
        throw new NotFoundError("Recurso relacionado não encontrado");
      }

      if (error.code === "P2025") {
        throw new NotFoundError("Registro não encontrado");
      }
    }

    throw error;
  }

  private async getWritableWallet(userId: string, walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: { creditCardInfo: true },
    });

    if (!wallet) {
      throw new NotFoundError("Carteira não encontrada");
    }

    if (wallet.ownerId === userId) return wallet;

    const access = await this.prisma.walletAccess.findUnique({
      where: {
        walletId_userId: {
          walletId,
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
        "Sem permissão para lançar transações nesta carteira",
      );
    }

    return wallet;
  }

  private async assertCanReadWallet(userId: string, walletId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
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

    if (!wallet) {
      throw new ForbiddenError("Sem permissão para acessar esta carteira");
    }
  }

  private async assertCanWriteWallet(userId: string, walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { id: true, ownerId: true },
    });

    if (!wallet) {
      throw new NotFoundError("Carteira não encontrada");
    }

    if (wallet.ownerId === userId) return;

    const access = await this.prisma.walletAccess.findUnique({
      where: {
        walletId_userId: {
          walletId,
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
        "Sem permissão para lançar transações nesta carteira",
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
      const originWallet = await this.getWritableWallet(userId, data.walletId);
      this.ensureCreditCardInfo(originWallet);

      await this.assertCategoryAccess(userId, data.categoryId);

      const baseDate = data.date ? new Date(data.date) : new Date();
      const tags = data.tags && data.tags.length ? data.tags : undefined;

      if (data.type === "TRANSFER") {
        const destinationWallet = await this.getWritableWallet(
          userId,
          data.destinationWalletId as string,
        );
        this.ensureCreditCardInfo(destinationWallet);

        const transferId = randomUUID();
        const invoiceMonth =
          typeof data.invoiceMonth === "string"
            ? data.invoiceMonth
            : destinationWallet.type === WalletType.CREDIT
              ? computeInvoiceMonth(
                  baseDate,
                  destinationWallet.creditCardInfo!.closingDay,
                )
              : undefined;

        const created = await this.prisma.$transaction(async (tx) => {
          const outTx = await tx.transaction.create({
            data: {
              walletId: originWallet.id,
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
              walletId: destinationWallet.id,
              categoryId: data.categoryId,
              amount: Math.abs(data.amount),
              description: data.description,
              date: baseDate,
              type: TransactionType.TRANSFER,
              isPaid: data.isPaid,
              transferId,
              tags,
              ...(destinationWallet.type === WalletType.CREDIT && invoiceMonth
                ? { invoiceMonth }
                : {}),
            },
          });

          if (destinationWallet.type === WalletType.CREDIT && data.isPaid) {
            await tx.transaction.updateMany({
              where: {
                walletId: destinationWallet.id,
                type: TransactionType.EXPENSE,
                isPaid: false,
                invoiceMonth,
              },
              data: { isPaid: true },
            });
          }

          return [outTx, inTx];
        });

        return created.map(toTransactionDTO);
      }

      if (originWallet.type === WalletType.CREDIT && data.recurrence) {
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
          const results: any[] = [];

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
                walletId: originWallet.id,
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

        return created.map(toTransactionDTO);
      }

      if (totalInstallments <= 1) {
        const invoiceMonth =
          originWallet.type === WalletType.CREDIT
            ? typeof data.invoiceMonth === "string"
              ? data.invoiceMonth
              : computeInvoiceMonth(
                  baseDate,
                  originWallet.creditCardInfo!.closingDay,
                )
            : null;

        const created = await this.prisma.transaction.create({
          data: {
            walletId: originWallet.id,
            categoryId: data.categoryId,
            amount: data.amount,
            description: data.description,
            date: baseDate,
            type: data.type as TransactionType,
            isPaid:
              originWallet.type === WalletType.CREDIT ? false : data.isPaid,
            tags,
            ...(originWallet.type === WalletType.CREDIT
              ? { purchaseDate: baseDate, invoiceMonth }
              : {}),
          },
        });
        return toTransactionDTO(created);
      }

      const totalCents = Math.round(Math.abs(data.amount) * 100);
      const baseCents = Math.floor(totalCents / totalInstallments);
      const installmentsGroupId = randomUUID();
      const firstInvoiceMonth =
        originWallet.type === WalletType.CREDIT
          ? typeof data.invoiceMonth === "string"
            ? data.invoiceMonth
            : computeInvoiceMonth(
                baseDate,
                originWallet.creditCardInfo!.closingDay,
              )
          : null;

      const created = await this.prisma.$transaction(async (tx) => {
        const results: any[] = [];
        for (let i = 1; i <= totalInstallments; i++) {
          const cents =
            i < totalInstallments
              ? baseCents
              : totalCents - baseCents * (totalInstallments - 1);
          const amount = cents / 100;
          const installmentDate = addMonths(baseDate, i - 1);
          const invoiceMonth =
            originWallet.type === WalletType.CREDIT && firstInvoiceMonth
              ? addInvoiceMonths(firstInvoiceMonth, i - 1)
              : null;

          const t = await tx.transaction.create({
            data: {
              walletId: originWallet.id,
              categoryId: data.categoryId,
              amount,
              description: data.description,
              date: installmentDate,
              type: data.type as TransactionType,
              isPaid:
                originWallet.type === WalletType.CREDIT
                  ? false
                  : i === 1
                    ? data.isPaid
                    : false,
              recurrenceId: installmentsGroupId,
              installmentNumber: i,
              totalInstallments,
              tags,
              ...(originWallet.type === WalletType.CREDIT
                ? { purchaseDate: baseDate, invoiceMonth }
                : {}),
            },
          });
          results.push(t);
        }
        return results;
      });

      return created.map(toTransactionDTO);
    } catch (error) {
      return this.handlePrismaCreateError(error);
    }
  }

  async listByWallet(
    userId: string,
    input: { walletId: string; from?: string; to?: string },
  ): Promise<TransactionDTO[]> {
    await this.assertCanReadWallet(userId, input.walletId);

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
        walletId: input.walletId,
        ...dateFilter,
      },
      orderBy: { date: "desc" },
    });

    return txs.map(toTransactionDTO);
  }

  async list(
    userId: string,
    input: {
      walletId?: string;
      from?: string;
      to?: string;
      q?: string;
      type?: "INCOME" | "EXPENSE" | "TRANSFER";
      limit?: number;
      cursorId?: string;
    },
  ): Promise<{ items: TransactionDTO[]; nextCursorId: string | null }> {
    const walletId =
      typeof input.walletId === "string" ? input.walletId : undefined;
    const from = input.from ? new Date(input.from) : undefined;
    const to = input.to ? new Date(input.to) : undefined;
    const limit = typeof input.limit === "number" ? input.limit : 30;
    const cursorId =
      typeof input.cursorId === "string" ? input.cursorId : undefined;
    const q = typeof input.q === "string" ? input.q.trim() : "";
    const type = input.type;

    if (walletId) {
      await this.assertCanReadWallet(userId, walletId);
    }

    const dateFilter =
      from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {};

    const where: Prisma.TransactionWhereInput = {
      ...(walletId
        ? { walletId }
        : {
            wallet: {
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
      ...(q
        ? {
            description: {
              contains: q,
            },
          }
        : {}),
      ...(type ? { type: type as any } : {}),
      ...dateFilter,
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
}
