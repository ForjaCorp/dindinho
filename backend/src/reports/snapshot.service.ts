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
    try {
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

      const upserts: Prisma.PrismaPromise<any>[] = [];

      if (dailyBalances.size === 0) {
        const currentDate = new Date(startOfDate);
        while (currentDate <= lastDate) {
          upserts.push(
            this.prisma.dailySnapshot.upsert({
              where: {
                accountId_date: {
                  accountId,
                  date: new Date(currentDate),
                },
              },
              update: {
                balance: account.initialBalance,
                calcVersion: SnapshotService.CALC_VERSION,
              },
              create: {
                accountId,
                date: new Date(currentDate),
                balance: account.initialBalance,
                calcVersion: SnapshotService.CALC_VERSION,
              },
            }),
          );
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      } else {
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
            upserts.push(
              this.prisma.dailySnapshot.upsert({
                where: {
                  accountId_date: {
                    accountId,
                    date: new Date(currentDate),
                  },
                },
                update: {
                  balance: runningBalance,
                  calcVersion: SnapshotService.CALC_VERSION,
                },
                create: {
                  accountId,
                  date: new Date(currentDate),
                  balance: runningBalance,
                  calcVersion: SnapshotService.CALC_VERSION,
                },
              }),
            );
          }

          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
      }

      // Executa os upserts em chunks controlados via $transaction para evitar exaustão de pool ou N+1
      const chunkSize = 500;
      for (let i = 0; i < upserts.length; i += chunkSize) {
        const chunk = upserts.slice(i, i + chunkSize);
        await this.prisma.$transaction(chunk);
      }
    } catch (err) {
      throw err;
    }
  }
}
