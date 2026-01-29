import { z } from "zod";

/**
 * Filtros comuns para relatórios
 */
export const reportFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  includePending: z.boolean().default(false),
});

export type ReportFilterDTO = z.infer<typeof reportFilterSchema>;

/**
 * Resposta de Gastos por Categoria
 */
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

/**
 * Resposta de Fluxo de Caixa
 */
export const cashFlowSchema = z.array(
  z.object({
    period: z.string(), // ISO month ou data
    income: z.number(),
    expense: z.number(),
    balance: z.number(),
  }),
);

export type CashFlowDTO = z.infer<typeof cashFlowSchema>;

/**
 * Resposta de Histórico de Saldo
 */
export const balanceHistorySchema = z.array(
  z.object({
    date: z.string(), // ISO date
    balance: z.number(),
  }),
);

export type BalanceHistoryDTO = z.infer<typeof balanceHistorySchema>;
