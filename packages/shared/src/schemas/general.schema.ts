import { z } from "zod";

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
