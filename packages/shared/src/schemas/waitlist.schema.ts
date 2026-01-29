import { z } from "zod";

/**
 * Schema para criação de um novo registro na lista de espera.
 */
export const createWaitlistSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
});

/** DTO para criação de registro na lista de espera */
export type CreateWaitlistDTO = z.infer<typeof createWaitlistSchema>;

/**
 * Schema de resposta para registros da lista de espera.
 */
export const waitlistResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.date(),
});

/** DTO de resposta da lista de espera */
export type WaitlistResponseDTO = z.infer<typeof waitlistResponseSchema>;
