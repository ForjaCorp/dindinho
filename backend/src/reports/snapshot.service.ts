import { Prisma, PrismaClient, TransactionType } from "@prisma/client";

/**
 * Serviço responsável por gerenciar snapshots diários de saldo das contas
 */
export class SnapshotService {
  static readonly CALC_VERSION = 2;

  constructor(private prisma: PrismaClient) {}

  /**
   * Atualiza os snapshots de uma conta a partir de uma data específica
   * @param accountId ID da conta
   * @param startDate Data de início da atualização (snapshots desta data em diante serão recalculados)
   * @param endDate Data final da atualização (padrão: hoje em UTC)
   */
  async updateSnapshots(
    accountId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<void> {
    const startOfDate = new Date(startDate);
    startOfDate.setUTCHours(0, 0, 0, 0);

    // 1. Pegar o saldo inicial da conta
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { initialBalance: true },
    });

    if (!account) return;

    // 2. Buscar todas as transações PAGAS da conta ordenadas por data
    // Nota: Para relatórios de saldo, consideramos a data da transação
    const transactions =
      (await this.prisma.transaction.findMany({
        where: {
          accountId,
          isPaid: true,
        },
        orderBy: { date: "asc" },
        select: { amount: true, date: true, type: true },
      })) || [];

    // 3. Calcular saldos acumulados por dia
    const dailyBalances = new Map<string, number>();
    let currentBalance = Number(account.initialBalance);

    // Precisamos iterar por todas as transações para garantir o saldo correto
    // mas só atualizaremos os snapshots a partir de startDate no banco
    for (const tx of transactions) {
      const rawAmount = Number(tx.amount);
      const magnitude = Math.abs(rawAmount);
      const delta =
        tx.type === TransactionType.INCOME
          ? magnitude
          : tx.type === TransactionType.EXPENSE
            ? -magnitude
            : rawAmount;

      currentBalance += delta;
      const dateKey = tx.date.toISOString().split("T")[0];
      dailyBalances.set(dateKey, currentBalance);
    }

    const lastDate = endDate ? new Date(endDate) : new Date();
    lastDate.setUTCHours(0, 0, 0, 0);

    if (dailyBalances.size === 0) {
      const currentDate = new Date(startOfDate);
      while (currentDate <= lastDate) {
        await this.upsertSnapshot(
          accountId,
          new Date(currentDate),
          account.initialBalance,
        );
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      return;
    }

    const sortedDates = Array.from(dailyBalances.keys()).sort();
    const firstTxDate = new Date(sortedDates[0]);
    const firstDate = new Date(
      Math.min(firstTxDate.getTime(), startOfDate.getTime()),
    );

    let runningBalance = Number(account.initialBalance);
    const currentDate = new Date(firstDate);

    while (currentDate <= lastDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const dayBalance = dailyBalances.get(dateKey);

      if (dayBalance !== undefined) {
        runningBalance = dayBalance;
      }

      // Só persistimos se a data for >= startDate
      if (currentDate >= startOfDate) {
        await this.upsertSnapshot(
          accountId,
          new Date(currentDate),
          runningBalance,
        );
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  private async upsertSnapshot(
    accountId: string,
    date: Date,
    balance: number | Prisma.Decimal,
  ) {
    await this.prisma.dailySnapshot.upsert({
      where: {
        accountId_date: {
          accountId,
          date,
        },
      },
      update: { balance, calcVersion: SnapshotService.CALC_VERSION },
      create: {
        accountId,
        date,
        balance,
        calcVersion: SnapshotService.CALC_VERSION,
      },
    });
  }
}
