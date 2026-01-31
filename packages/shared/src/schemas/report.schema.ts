import { z } from "zod";

const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const balanceHistoryGranularitySchema = z.enum(["DAY", "WEEK", "MONTH"]);

export type BalanceHistoryGranularity = z.infer<
  typeof balanceHistoryGranularitySchema
>;

export const reportFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  includePending: z.coerce.boolean().default(false),
  granularity: balanceHistoryGranularitySchema.optional(),
  changeOnly: z.coerce.boolean().optional(),
});

export type ReportFilterDTO = z.infer<typeof reportFilterSchema>;

export const spendingByCategorySchema = z.array(
  z.object({
    categoryId: z.string().uuid().nullable(),
    categoryName: z.string(),
    icon: z.string(),
    color: z.string().optional(),
    amount: z.number(),
    percentage: z.number(),
  }),
);

export type SpendingByCategoryDTO = z.infer<typeof spendingByCategorySchema>;

export const cashFlowSchema = z.array(
  z.object({
    period: z.string(),
    income: z.number(),
    expense: z.number(),
    balance: z.number(),
  }),
);

export type CashFlowDTO = z.infer<typeof cashFlowSchema>;

export const balanceHistorySchema = z.array(
  z.object({
    date: isoDaySchema,
    t: z.number().int().nonnegative().optional(),
    label: z.string().min(1).optional(),
    periodStart: isoDaySchema.optional(),
    periodEnd: isoDaySchema.optional(),
    balance: z.number(),
    changed: z.boolean().optional(),
    delta: z.number().optional(),
  }),
);

export type BalanceHistoryDTO = z.infer<typeof balanceHistorySchema>;
