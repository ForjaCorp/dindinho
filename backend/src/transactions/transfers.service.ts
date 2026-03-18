import { AccountType, Prisma, TransactionType } from "@prisma/client";
import { CreateTransactionDTO } from "@dindinho/shared";
import { computeInvoiceMonth } from "./transactions.utils";
import { randomUUID } from "node:crypto";

export class TransfersService {
  /**
   * Explodes the logical parts of a transfer into an array of in/out transactions
   * executing them securely using a Prisma transaction.
   */
  async createTransfer(
    tx: Prisma.TransactionClient,
    originAccount: { id: string },
    destinationAccount: {
      id: string;
      type: AccountType;
      creditCardInfo?: { closingDay: number } | null;
    },
    baseDate: Date,
    data: CreateTransactionDTO,
    tags?: string[],
  ) {
    const transferId = randomUUID();
    const invoiceMonth =
      typeof data.invoiceMonth === "string"
        ? data.invoiceMonth
        : destinationAccount.type === AccountType.CREDIT &&
            destinationAccount.creditCardInfo
          ? computeInvoiceMonth(
              baseDate,
              destinationAccount.creditCardInfo.closingDay,
            )
          : undefined;

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
  }
}
