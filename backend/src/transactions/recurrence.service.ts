import { Prisma, TransactionType, RecurrenceFrequency } from "@prisma/client";
import { CreateTransactionDTO } from "@dindinho/shared";
import { addDays, addMonths, addYears } from "./transactions.utils";

export class RecurrenceService {
  /**
   * Expande a criação de uma transação recorrente em múltiplas ocorrências (até 360)
   * e as insere individualmente no banco de dados usando a transação ativa (tx).
   * @async
   * @param {Prisma.TransactionClient} tx - Cliente de transação do Prisma
   * @param {string} accountId - ID da conta destino
   * @param {string} accountType - Tipo da conta
   * @param {Date} baseDate - Data da primeira ocorrência
   * @param {CreateTransactionDTO} data - Dados base para a recorrência
   * @param {string} recurrenceId - Identificador único da série de recorrência
   * @param {string[]} [tags] - Lista de tags opcionais
   * @returns {Promise<Transaction[]>} Lista de transações recorrentes criadas
   */
  async createRecurring(
    tx: Prisma.TransactionClient,
    accountId: string,
    accountType: string,
    baseDate: Date,
    data: CreateTransactionDTO,
    recurrenceId: string,
    tags?: string[],
  ) {
    if (!data.recurrence) return [];

    const count = data.recurrence.forever
      ? 360
      : (data.recurrence.count as number);
    const freq = data.recurrence.frequency;
    const intervalDays =
      freq === "CUSTOM" ? (data.recurrence.intervalDays as number) : null;

    const results: import("@prisma/client").Transaction[] = [];

    for (let i = 1; i <= count; i++) {
      let date = baseDate;
      if (freq === "MONTHLY") date = addMonths(baseDate, i - 1);
      else if (freq === "WEEKLY") date = addDays(baseDate, (i - 1) * 7);
      else if (freq === "YEARLY") date = addYears(baseDate, i - 1);
      else if (freq === "CUSTOM" && intervalDays)
        date = addDays(baseDate, (i - 1) * intervalDays);

      const t = await tx.transaction.create({
        data: {
          accountId,
          categoryId: data.categoryId,
          amount: data.amount,
          description: data.description,
          date,
          type: data.type as TransactionType,
          isPaid: i === 1 ? data.isPaid : false,
          recurrenceId,
          recurrenceFrequency: freq as RecurrenceFrequency,
          recurrenceIntervalDays: intervalDays,
          installmentNumber: i,
          totalInstallments: count,
          tags,
        },
      });
      results.push(t);
    }

    return results;
  }
}
