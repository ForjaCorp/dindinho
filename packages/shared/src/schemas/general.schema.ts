import { z } from "zod";

export const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .refine((value) => {
    const [y, m, d] = value.split("-").map((v) => Number(v));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
      return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }, "Data inválida");

export const invoiceMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Mês de fatura inválido")
  .refine((value) => {
    const month = Number(value.split("-")[1]);
    return Number.isFinite(month) && month >= 1 && month <= 12;
  }, "Mês de fatura inválido");

/**
 * Resposta da rota raiz (/)
 */
export const apiResponseSchema = z.object({
  message: z.string(),
  // O backend enviava "docs", o front esperava "aviso". Vamos padronizar como "docs".
  docs: z.string().optional(),
  endpoints: z.object({
    health: z.string(),
    test_db: z.string(),
  }),
});
export type ApiResponseDTO = z.infer<typeof apiResponseSchema>;

/**
 * Resposta do Health Check (/health)
 */
export const healthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.date().or(z.string()), // Pode vir como string no JSON
  app: z.string(),
});
export type HealthCheckDTO = z.infer<typeof healthCheckSchema>;

/**
 * Resposta do Teste de DB (/test-db)
 */
export const dbTestSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
  usersCount: z.number().optional(),
});
export type DbTestDTO = z.infer<typeof dbTestSchema>;
