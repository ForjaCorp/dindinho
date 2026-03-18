import { AccountType, Prisma, TransactionType } from "@prisma/client";
import { CreateTransactionDTO } from "@dindinho/shared";
import {
  addInvoiceMonths,
  addMonths,
  computeInvoiceMonth,
} from "./transactions.utils";
import { randomUUID } from "node:crypto";

export class InstallmentsService {
  /**
   * Divides a transaction payload into installments safely accounting for rounding errors,
   * then inserts them using the active transaction (tx).
   */
  async createInstallments(
    tx: Prisma.TransactionClient,
    accountId: string,
    accountType: string,
    closingDay: number | null,
    baseDate: Date,
    data: CreateTransactionDTO,
    installmentsGroupId: string,
    tags?: string[],
  ) {
    const totalInstallments = data.totalInstallments ?? 1;
    const totalCents = Math.round(Math.abs(data.amount) * 100);
    const baseCents = Math.floor(totalCents / totalInstallments);

    const firstInvoiceMonth =
      accountType === AccountType.CREDIT
        ? typeof data.invoiceMonth === "string"
          ? data.invoiceMonth
          : closingDay
            ? computeInvoiceMonth(baseDate, closingDay)
            : null
        : null;

    const results: import("@prisma/client").Transaction[] = [];

    for (let i = 1; i <= totalInstallments; i++) {
      const cents =
        i < totalInstallments
          ? baseCents
          : totalCents - baseCents * (totalInstallments - 1);
      const amount = cents / 100;
      const installmentDate = addMonths(baseDate, i - 1);
      const invoiceMonth =
        accountType === AccountType.CREDIT && firstInvoiceMonth
          ? addInvoiceMonths(firstInvoiceMonth, i - 1)
          : null;

      const t = await tx.transaction.create({
        data: {
          accountId,
          categoryId: data.categoryId,
          amount,
          description: data.description,
          date: installmentDate,
          type: data.type as TransactionType,
          isPaid:
            accountType === AccountType.CREDIT
              ? false
              : i === 1
                ? data.isPaid
                : false,
          recurrenceId: installmentsGroupId,
          installmentNumber: i,
          totalInstallments,
          tags,
          ...(accountType === AccountType.CREDIT
            ? { purchaseDate: baseDate, invoiceMonth }
            : {}),
        },
      });
      results.push(t);
    }

    return results;
  }
}
