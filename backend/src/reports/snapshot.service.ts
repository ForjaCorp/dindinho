import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Serviço responsável por gerenciar snapshots diários de saldo das contas
 */
export class SnapshotService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Atualiza os snapshots de uma conta a partir de uma data específica
   * @param accountId ID da conta
   * @param startDate Data de início da atualização (snapshots desta data em diante serão recalculados)
   */
  async updateSnapshots(accountId: string, startDate: Date): Promise<void> {
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
        select: { amount: true, date: true },
      })) || [];

    // 3. Calcular saldos acumulados por dia
    const dailyBalances = new Map<string, number>();
    let currentBalance = Number(account.initialBalance);

    // Precisamos iterar por todas as transações para garantir o saldo correto
    // mas só atualizaremos os snapshots a partir de startDate no banco
    for (const tx of transactions) {
      currentBalance += Number(tx.amount);
      const dateKey = tx.date.toISOString().split("T")[0];
      dailyBalances.set(dateKey, currentBalance);
    }

    // 4. Determinar o range de datas a atualizar
    // Se não houver transações, o saldo é o inicial
    if (dailyBalances.size === 0) {
      await this.upsertSnapshot(accountId, startOfDate, account.initialBalance);
      return;
    }

    const sortedDates = Array.from(dailyBalances.keys()).sort();
    const firstDate = new Date(sortedDates[0]);
    const lastDate = new Date(); // Snapshots até hoje
    lastDate.setUTCHours(0, 0, 0, 0);

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
      update: { balance },
      create: {
        accountId,
        date,
        balance,
      },
    });
  }
}
