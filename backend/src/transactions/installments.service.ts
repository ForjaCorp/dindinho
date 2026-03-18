import { AccountType, Prisma, TransactionType } from "@prisma/client";
import { CreateTransactionDTO } from "@dindinho/shared";
import {
  addInvoiceMonths,
  addMonths,
  computeInvoiceMonth,
} from "./transactions.utils";

export class InstallmentsService {
  /**
   * Divide o payload de uma transação em parcelas, tratando erros de arredondamento de centavos
   * e inserindo-as no banco de dados através da transação ativa (tx).
   * @async
   * @param {Prisma.TransactionClient} tx - Cliente de transação do Prisma
   * @param {string} accountId - ID da conta destino das parcelas
   * @param {string} accountType - Tipo da conta (CREDIT ou STANDARD)
   * @param {number | null} closingDay - Dia de fechamento da fatura (para cartões)
   * @param {Date} baseDate - Data de início do parcelamento
   * @param {CreateTransactionDTO} data - Dados base da transação
   * @param {string} installmentsGroupId - Identificador único do grupo de parcelas
   * @param {string[]} [tags] - Lista de tags opcionais
   * @returns {Promise<Transaction[]>} Lista de transações (parcelas) criadas
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
