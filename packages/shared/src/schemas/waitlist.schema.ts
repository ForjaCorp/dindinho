import { z } from "zod";

export const createWaitlistSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
});

export type CreateWaitlistDTO = z.infer<typeof createWaitlistSchema>;

export const waitlistResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.date(),
});

export type WaitlistResponseDTO = z.infer<typeof waitlistResponseSchema>;
