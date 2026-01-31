import { PrismaClient, TransactionType, Prisma } from "@prisma/client";
import {
  ReportFilterDTO,
  SpendingByCategoryDTO,
  CashFlowDTO,
  BalanceHistoryDTO,
  BalanceHistoryGranularity,
} from "@dindinho/shared";
import { CsvHelper } from "../lib/csv-helper";
import { SnapshotService } from "./snapshot.service";

export class ReportsService {
  private snapshotService: SnapshotService;
  private warmupByAccountId = new Map<string, Promise<void>>();

  constructor(private prisma: PrismaClient) {
    this.snapshotService = new SnapshotService(prisma);
  }

  private toUtcStartOfDay(input: Date): Date {
    const d = new Date(input);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private daysBetweenUtcInclusive(start: Date, end: Date): number {
    const startUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    const endUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );
    const diffDays = Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
    return diffDays + 1;
  }

  private addUtcDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private endOfWeekUtc(date: Date): Date {
    const d = this.toUtcStartOfDay(date);
    const day = d.getUTCDay();
    const daysToAdd = (7 - day) % 7;
    return this.addUtcDays(d, daysToAdd);
  }

  private endOfMonthUtc(date: Date): Date {
    const d = this.toUtcStartOfDay(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  }

  private listPeriodEndDates(
    rangeStart: Date,
    rangeEnd: Date,
    granularity: Exclude<BalanceHistoryGranularity, "DAY">,
  ): Date[] {
    const endDates: Date[] = [];
    let cursor = this.toUtcStartOfDay(rangeStart);
    const end = this.toUtcStartOfDay(rangeEnd);

    while (cursor <= end) {
      const periodEnd =
        granularity === "WEEK"
          ? this.endOfWeekUtc(cursor)
          : this.endOfMonthUtc(cursor);
      const clipped = periodEnd <= end ? periodEnd : end;
      endDates.push(clipped);
      cursor = this.addUtcDays(clipped, 1);
    }

    return endDates;
  }

  private inferBalanceHistoryGranularity(
    rangeStart: Date,
    rangeEnd: Date,
  ): BalanceHistoryGranularity {
    const totalDays = this.daysBetweenUtcInclusive(rangeStart, rangeEnd);

    if (totalDays <= 92) return "DAY";
    if (totalDays <= 366) return "WEEK";
    return "MONTH";
  }

  private computeBalanceHistoryLabel(
    isoDate: string,
    granularity: BalanceHistoryGranularity,
  ): string {
    if (granularity === "MONTH") {
      return isoDate.substring(0, 7);
    }
    return isoDate;
  }

  private async ensureSnapshotsForAccount(
    accountId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<void> {
    const hasOutdated = await this.prisma.dailySnapshot.findFirst({
      where: {
        accountId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        calcVersion: {
          not: SnapshotService.CALC_VERSION,
        },
      },
      select: { id: true },
    });

    const aggregate = await this.prisma.dailySnapshot.aggregate({
      where: { accountId },
      _min: { date: true },
      _max: { date: true },
    });

    const minDate = aggregate._min.date
      ? this.toUtcStartOfDay(aggregate._min.date)
      : null;
    const maxDate = aggregate._max.date
      ? this.toUtcStartOfDay(aggregate._max.date)
      : null;

    const expectedDays = this.daysBetweenUtcInclusive(rangeStart, rangeEnd);
    const shouldCheckCount = expectedDays > 0 && expectedDays <= 370;

    const count = shouldCheckCount
      ? await this.prisma.dailySnapshot.count({
          where: {
            accountId,
            date: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
        })
      : null;

    const needsWarmup =
      !!hasOutdated ||
      !minDate ||
      !maxDate ||
      minDate.getTime() > rangeStart.getTime() ||
      maxDate.getTime() < rangeEnd.getTime() ||
      (typeof count === "number" && count < expectedDays);

    if (!needsWarmup) return;

    const existing = this.warmupByAccountId.get(accountId);
    if (existing) {
      await existing;
      return;
    }

    const promise = this.snapshotService
      .updateSnapshots(accountId, rangeStart, rangeEnd)
      .finally(() => {
        this.warmupByAccountId.delete(accountId);
      });

    this.warmupByAccountId.set(accountId, promise);
    await promise;
  }

  /**
   * Agrega gastos por categoria
   */
  async getSpendingByCategory(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<SpendingByCategoryDTO> {
    const where = this.buildBaseWhere(userId, filters);
    where.type = TransactionType.EXPENSE;

    const aggregations = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where,
      _sum: {
        amount: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const total = aggregations.reduce(
      (sum, curr) => sum + Math.abs(Number(curr._sum.amount || 0)),
      0,
    );

    return aggregations
      .map((agg) => {
        const cat = agg.categoryId ? categoryMap.get(agg.categoryId) : null;
        const amount = Math.abs(Number(agg._sum.amount || 0));
        return {
          categoryId: agg.categoryId,
          categoryName: cat?.name || "Sem Categoria",
          icon: cat?.icon || "pi-tag",
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Agrega fluxo de caixa (Entradas vs Saídas)
   */
  async getCashFlow(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<CashFlowDTO> {
    const where = this.buildBaseWhere(userId, filters);
    where.type = { in: [TransactionType.INCOME, TransactionType.EXPENSE] };

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
        date: true,
        invoiceMonth: true,
      },
      orderBy: { date: "asc" },
    });

    const monthlyData = new Map<string, { income: number; expense: number }>();

    for (const tx of transactions) {
      // Usar invoiceMonth para cartões de crédito, date para o resto
      let monthKey: string;
      if (tx.invoiceMonth) {
        monthKey = tx.invoiceMonth;
      } else {
        monthKey = tx.date.toISOString().substring(0, 7); // YYYY-MM
      }

      const current = monthlyData.get(monthKey) || { income: 0, expense: 0 };

      const amount = Math.abs(Number(tx.amount));
      if (tx.type === TransactionType.INCOME) {
        current.income += amount;
      } else {
        current.expense += amount;
      }

      monthlyData.set(monthKey, current);
    }

    return Array.from(monthlyData.entries()).map(([period, data]) => ({
      period,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }));
  }

  /**
   * Retorna histórico de saldo acumulado usando Snapshots
   */
  async getBalanceHistory(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<BalanceHistoryDTO> {
    const { startDate, endDate, accountIds, granularity, changeOnly } = filters;

    const today = this.toUtcStartOfDay(new Date());
    const rangeEnd = endDate ? this.toUtcStartOfDay(new Date(endDate)) : today;
    const rangeStart = startDate
      ? this.toUtcStartOfDay(new Date(startDate))
      : this.toUtcStartOfDay(
          new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate() - 90,
            ),
          ),
        );

    const effectiveGranularity =
      granularity ?? this.inferBalanceHistoryGranularity(rangeStart, rangeEnd);

    const scopedAccountIds = (
      await this.prisma.account.findMany({
        where: {
          ownerId: userId,
          ...(accountIds?.length ? { id: { in: accountIds } } : {}),
        },
        select: { id: true },
      })
    ).map((a) => a.id);

    await Promise.all(
      scopedAccountIds.map((accountId) =>
        this.ensureSnapshotsForAccount(accountId, rangeStart, rangeEnd),
      ),
    );

    const where: Prisma.DailySnapshotWhereInput = {
      account: {
        ownerId: userId,
      },
    };

    const periodDates =
      effectiveGranularity === "DAY"
        ? null
        : this.listPeriodEndDates(rangeStart, rangeEnd, effectiveGranularity);

    const periodMetaByEndDate = new Map<
      string,
      { periodStart: string; periodEnd: string }
    >();
    if (periodDates?.length) {
      let cursor = this.toUtcStartOfDay(rangeStart);
      for (const periodEndDate of periodDates) {
        const startIso = cursor.toISOString().split("T")[0];
        const endIso = periodEndDate.toISOString().split("T")[0];
        periodMetaByEndDate.set(endIso, {
          periodStart: startIso,
          periodEnd: endIso,
        });
        cursor = this.addUtcDays(periodEndDate, 1);
      }
    }

    where.date =
      effectiveGranularity === "DAY"
        ? {
            gte: rangeStart,
            lte: rangeEnd,
          }
        : {
            in: periodDates ?? [],
          };

    if (accountIds?.length) {
      where.accountId = { in: accountIds };
    }

    const snapshots = await this.prisma.dailySnapshot.groupBy({
      by: ["date"],
      where,
      _sum: {
        balance: true,
      },
      orderBy: { date: "asc" },
    });

    const points: BalanceHistoryDTO = snapshots.map((s) => {
      const isoDate = s.date.toISOString().split("T")[0];
      const meta = periodMetaByEndDate.get(isoDate);
      return {
        date: isoDate,
        t: Date.UTC(
          s.date.getUTCFullYear(),
          s.date.getUTCMonth(),
          s.date.getUTCDate(),
        ),
        label: this.computeBalanceHistoryLabel(isoDate, effectiveGranularity),
        periodStart: meta?.periodStart ?? isoDate,
        periodEnd: meta?.periodEnd ?? isoDate,
        balance: Number(s._sum.balance || 0),
      };
    });

    const withDelta: BalanceHistoryDTO = points.map((p, idx) => {
      if (idx === 0) return { ...p, changed: true };

      const prev = points[idx - 1];
      const delta = p.balance - prev.balance;
      return {
        ...p,
        delta,
        changed: delta !== 0,
      };
    });

    if (!changeOnly) return withDelta;

    const filtered: BalanceHistoryDTO = [];
    for (let i = 0; i < withDelta.length; i += 1) {
      if (i === 0) {
        filtered.push(withDelta[i]);
        continue;
      }

      if (withDelta[i].changed) filtered.push(withDelta[i]);
    }

    if (withDelta.length > 1) {
      const last = withDelta[withDelta.length - 1];
      const alreadyHasLast =
        filtered.length > 0 && filtered[filtered.length - 1].date === last.date;
      if (!alreadyHasLast) filtered.push(last);
    }

    return filtered;
  }

  /**
   * Gera CSV das transações filtradas
   */
  async exportTransactionsCsv(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<string> {
    const where = this.buildBaseWhere(userId, filters);

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
      },
      orderBy: { date: "desc" },
    });

    const csv = new CsvHelper();
    csv.setHeaders([
      "Data",
      "Descrição",
      "Categoria",
      "Conta",
      "Tipo",
      "Valor",
      "Pago",
    ]);

    for (const t of transactions) {
      csv.addRow([
        t.date.toISOString().split("T")[0],
        t.description || "",
        t.category?.name || "Sem Categoria",
        t.account.name,
        t.type,
        Number(t.amount),
        t.isPaid ? "Sim" : "Não",
      ]);
    }

    return csv.build();
  }

  /**
   * Constrói o filtro base para transações
   */
  private buildBaseWhere(
    userId: string,
    filters: ReportFilterDTO,
  ): Prisma.TransactionWhereInput {
    const { startDate, endDate, accountIds, includePending } = filters;

    const where: Prisma.TransactionWhereInput = {
      account: {
        ownerId: userId,
      },
    };

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (accountIds?.length) {
      where.accountId = { in: accountIds };
    }

    if (!includePending) {
      where.isPaid = true;
    }

    return where;
  }
}
