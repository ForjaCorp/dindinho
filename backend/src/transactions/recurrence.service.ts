import { AccountType, Prisma, TransactionType } from "@prisma/client";
import { CreateTransactionDTO } from "@dindinho/shared";
import {
  addDays,
  addDaysByMs,
  addMonths,
  addYears,
} from "./transactions.utils";
import { randomUUID } from "node:crypto";

export class RecurrenceService {
  /**
   * Explodes a single recurring transaction creation payload into multiple occurrences
   * and inserts them using the active transaction (tx).
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
          recurrenceFrequency: freq as any,
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
