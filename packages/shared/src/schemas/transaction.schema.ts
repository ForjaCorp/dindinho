import { z } from "zod";

export const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

export const RecurrenceFrequencyEnum = z.enum([
  "MONTHLY",
  "WEEKLY",
  "YEARLY",
  "CUSTOM",
]);

const invoiceMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Mês de fatura inválido");

export const transactionRecurrenceSchema = z
  .object({
    frequency: RecurrenceFrequencyEnum,
    intervalDays: z.number().int().min(1).max(3650).optional(),
    count: z.number().int().min(1).max(360).optional(),
    forever: z.boolean().optional(),
  })
  .refine((data) => data.count !== undefined || data.forever === true, {
    path: ["count"],
    message: "Informe a duração da recorrência",
  })
  .refine(
    (data) => data.frequency !== "CUSTOM" || data.intervalDays !== undefined,
    {
      path: ["intervalDays"],
      message: "Intervalo é obrigatório na recorrência personalizada",
    },
  );

export const createTransactionSchema = z
  .object({
    walletId: z.string().uuid(),
    categoryId: z.string().uuid(),
    amount: z.number().positive("Valor deve ser positivo"),
    description: z.string().trim().min(1, "Descrição é obrigatória"),
    date: z.string().datetime().optional(),
    type: TransactionTypeEnum,
    isPaid: z.boolean().optional().default(true),
    totalInstallments: z.number().int().min(1).max(360).optional(),
    destinationWalletId: z.string().uuid().optional(),
    recurrence: transactionRecurrenceSchema.optional(),
    tags: z.array(z.string().trim().min(1)).max(20).optional(),
    invoiceMonth: invoiceMonthSchema.optional(),
  })
  .refine(
    (data) =>
      data.totalInstallments === undefined ||
      data.totalInstallments <= 1 ||
      data.type === "EXPENSE",
    {
      path: ["totalInstallments"],
      message: "Parcelamento só é permitido para despesas",
    },
  )
  .refine(
    (data) =>
      data.type !== "TRANSFER" || data.destinationWalletId !== undefined,
    {
      path: ["destinationWalletId"],
      message: "Conta de destino é obrigatória para transferência",
    },
  )
  .refine(
    (data) =>
      data.type === "TRANSFER" || data.destinationWalletId === undefined,
    {
      path: ["destinationWalletId"],
      message: "Conta de destino só é usada em transferências",
    },
  )
  .refine((data) => data.type !== "TRANSFER" || data.recurrence === undefined, {
    path: ["recurrence"],
    message: "Recorrência não é permitida em transferências",
  });

export type CreateTransactionDTO = z.infer<typeof createTransactionSchema>;

export const transactionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  amount: z.coerce.number(),
  description: z.string().nullable().optional(),
  date: z.string().datetime(),
  type: TransactionTypeEnum,
  isPaid: z.boolean(),
  transferId: z.string().uuid().nullable().optional(),
  recurrenceId: z.string().nullable().optional(),
  recurrenceFrequency: RecurrenceFrequencyEnum.nullable().optional(),
  recurrenceIntervalDays: z.number().int().nullable().optional(),
  installmentNumber: z.number().int().nullable().optional(),
  totalInstallments: z.number().int().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  invoiceMonth: invoiceMonthSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TransactionDTO = z.infer<typeof transactionSchema>;

export const listTransactionsQuerySchema = z.object({
  walletId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  type: TransactionTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursorId: z.string().uuid().optional(),
});

export type ListTransactionsQueryDTO = z.infer<
  typeof listTransactionsQuerySchema
>;

export const paginatedTransactionsSchema = z.object({
  items: z.array(transactionSchema),
  nextCursorId: z.string().uuid().nullable(),
});

export type PaginatedTransactionsDTO = z.infer<
  typeof paginatedTransactionsSchema
>;

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  icon: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
});

export type CategoryDTO = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  icon: z.string().trim().min(1, "Ícone é obrigatório"),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
