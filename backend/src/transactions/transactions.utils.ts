import { Transaction } from "@prisma/client";
import { TransactionDTO } from "@dindinho/shared";

export const addMonths = (date: Date, monthsToAdd: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d;
};

export const addDays = (date: Date, daysToAdd: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + daysToAdd);
  return d;
};

export const addDaysByMs = (date: Date, daysToAdd: number): Date =>
  new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

export const addYears = (date: Date, yearsToAdd: number): Date => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + yearsToAdd);
  return d;
};

export const formatInvoiceMonth = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const parseInvoiceMonthToDate = (invoiceMonth: string): Date => {
  const [y, m] = invoiceMonth.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
};

export const parseIsoDayToUtcStartOfDay = (
  value: string,
  tzOffsetMinutes: number | null,
): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const utcStartMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const utcCandidate = new Date(utcStartMs);
  if (
    utcCandidate.getUTCFullYear() !== year ||
    utcCandidate.getUTCMonth() !== month - 1 ||
    utcCandidate.getUTCDate() !== day
  ) {
    return null;
  }
  const offsetMs =
    typeof tzOffsetMinutes === "number" && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes * 60 * 1000
      : 0;
  return new Date(utcStartMs + offsetMs);
};

export const addInvoiceMonths = (
  invoiceMonth: string,
  monthsToAdd: number,
): string => {
  const base = parseInvoiceMonthToDate(invoiceMonth);
  return formatInvoiceMonth(addMonths(base, monthsToAdd));
};

export const computeInvoiceMonth = (
  purchaseDate: Date,
  closingDay: number,
): string => {
  const utcDay = purchaseDate.getUTCDate();
  const base = new Date(
    Date.UTC(
      purchaseDate.getUTCFullYear(),
      purchaseDate.getUTCMonth(),
      1,
      0,
      0,
      0,
    ),
  );
  return formatInvoiceMonth(utcDay > closingDay ? addMonths(base, 1) : base);
};

export const toTransactionDTO = (t: Transaction): TransactionDTO => ({
  id: t.id,
  accountId: t.accountId,
  categoryId: t.categoryId ?? null,
  amount: Number(t.amount),
  description: t.description ?? null,
  date: new Date(t.date).toISOString(),
  type: t.type,
  isPaid: t.isPaid,
  transferId: t.transferId ?? null,
  recurrenceId: t.recurrenceId ?? null,
  recurrenceFrequency: t.recurrenceFrequency ?? null,
  recurrenceIntervalDays: t.recurrenceIntervalDays ?? null,
  installmentNumber: t.installmentNumber ?? null,
  totalInstallments: t.totalInstallments ?? null,
  tags: Array.isArray(t.tags) ? (t.tags as string[]) : null,
  purchaseDate: t.purchaseDate ? new Date(t.purchaseDate).toISOString() : null,
  invoiceMonth: t.invoiceMonth ?? null,
  createdAt: new Date(t.createdAt).toISOString(),
  updatedAt: new Date(t.updatedAt).toISOString(),
});
