import { PrismaClient, TransactionType, Prisma } from "@prisma/client";
import {
  ReportFilterDTO,
  SpendingByCategoryDTO,
  CashFlowDTO,
  BalanceHistoryDTO,
} from "@dindinho/shared";

export class ReportsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Agrega gastos por categoria
   */
  async getSpendingByCategory(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<SpendingByCategoryDTO> {
    const { startDate, endDate, accountIds, includePending } = filters;

    const where: Prisma.TransactionWhereInput = {
      account: {
        ownerId: userId,
      },
      type: TransactionType.EXPENSE,
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
    const { startDate, endDate, accountIds, includePending } = filters;

    const where: Prisma.TransactionWhereInput = {
      account: {
        ownerId: userId,
      },
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
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
    const { startDate, endDate, accountIds } = filters;

    const where: Prisma.DailySnapshotWhereInput = {
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

    const snapshots = await this.prisma.dailySnapshot.groupBy({
      by: ["date"],
      where,
      _sum: {
        balance: true,
      },
      orderBy: { date: "asc" },
    });

    return snapshots.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      balance: Number(s._sum.balance || 0),
    }));
  }
}
