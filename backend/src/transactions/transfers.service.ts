import { AccountType, Prisma, TransactionType } from "@prisma/client";
import { CreateTransactionDTO } from "@dindinho/shared";
import { computeInvoiceMonth } from "./transactions.utils";
import { randomUUID } from "node:crypto";

export class TransfersService {
  /**
   * Realiza a explosão lógica de uma transferência em duas transações (saída e entrada)
   * de forma atômica e segura usando o cliente de transação (tx).
   * @async
   * @param {Prisma.TransactionClient} tx - Cliente de transação do Prisma
   * @param {Object} originAccount - Conta de origem dos fundos
   * @param {Object} destinationAccount - Conta de destino dos fundos
   * @param {Date} baseDate - Data da transferência
   * @param {CreateTransactionDTO} data - Dados da transferência
   * @param {string[]} [tags] - Lista de tags opcionais
   * @returns {Promise<Transaction[]>} Par de transações criadas [Saída, Entrada]
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
