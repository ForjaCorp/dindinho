import { z } from "zod";
import { invoiceMonthSchema } from "./transaction.schema";

export const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const periodPresetSchema = z.enum([
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "LAST_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "CUSTOM",
]);

export type PeriodPreset = z.infer<typeof periodPresetSchema>;

/**
 * Seleção de período para o filtro temporal.
 *
 * - Presets conhecidos usam somente `preset`.
 * - `CUSTOM` exige `startDay/endDay`.
 */
export const periodSelectionSchema = z
  .object({
    preset: periodPresetSchema,
    tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional(),
    startDay: isoDaySchema.optional(),
    endDay: isoDaySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.preset !== "CUSTOM") return;

    if (typeof data.startDay !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDay"],
        message: "Data inicial é obrigatória no preset CUSTOM",
      });
    }

    if (typeof data.endDay !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDay"],
        message: "Data final é obrigatória no preset CUSTOM",
      });
    }
  });

export type PeriodSelectionDTO = z.infer<typeof periodSelectionSchema>;

/**
 * Seleção do filtro temporal com duas “lentes”:
 * - `DAY_RANGE`: período por dia (presets e custom)
 * - `INVOICE_MONTH`: competência de fatura (YYYY-MM)
 */
export const timeFilterSelectionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("DAY_RANGE"),
    period: periodSelectionSchema,
  }),
  z.object({
    mode: z.literal("INVOICE_MONTH"),
    invoiceMonth: invoiceMonthSchema,
  }),
]);

export type TimeFilterSelectionDTO = z.infer<typeof timeFilterSelectionSchema>;

export const balanceHistoryGranularitySchema = z.enum(["DAY", "WEEK", "MONTH"]);

export type BalanceHistoryGranularity = z.infer<
  typeof balanceHistoryGranularitySchema
>;

/**
 * Filtros de relatórios.
 *
 * - `startDay/endDay`: dia no formato YYYY-MM-DD (sem horário), pensado para o período do seletor.
 * - `tzOffsetMinutes`: offset em minutos (ex.: `Date#getTimezoneOffset`) para interpretar o dia local.
 * - `invoiceMonth`: competência (YYYY-MM) para lente de fatura.
 * - `startDate/endDate`: compatibilidade com filtros DateTime legados.
 *
 * Regras:
 * - `invoiceMonth` é mutuamente exclusivo com `startDay/endDay/startDate/endDate`.
 */
export const reportFilterSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    startDay: isoDaySchema.optional(),
    endDay: isoDaySchema.optional(),
    tzOffsetMinutes: z.coerce.number().int().min(-840).max(840).optional(),
    invoiceMonth: invoiceMonthSchema.optional(),
    accountIds: z.array(z.string().uuid()).optional(),
    includePending: z.coerce.boolean().default(false),
    granularity: balanceHistoryGranularitySchema.optional(),
    changeOnly: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (typeof data.invoiceMonth !== "string") return;

    const conflictingKeys: Array<
      "startDate" | "endDate" | "startDay" | "endDay"
    > = ["startDate", "endDate", "startDay", "endDay"];

    for (const key of conflictingKeys) {
      if (data[key] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Não combine invoiceMonth com filtros de período",
        });
      }
    }
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
