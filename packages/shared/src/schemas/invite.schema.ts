import { z } from "zod";
import { ResourcePermission } from "./auth.schema";

/**
 * Enum para status de convites
 * @enum {string}
 */
export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

/**
 * Esquema para os detalhes de uma conta dentro de um convite
 * @constant {z.ZodObject} inviteAccountSchema
 */
export const inviteAccountSchema = z.object({
  accountId: z.string().uuid("ID da conta inválido"),
  permission: z
    .nativeEnum(ResourcePermission)
    .default(ResourcePermission.VIEWER),
});

/**
 * Esquema para criação de um novo convite
 * @constant {z.ZodObject} createInviteSchema
 */
export const createInviteSchema = z.object({
  email: z.string().email("Email inválido"),
  accounts: z.array(inviteAccountSchema).min(1, "Selecione ao menos uma conta"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

/**
 * Tipo para o payload de criação de convite
 */
export type CreateInviteDTO = z.infer<typeof createInviteSchema>;

/**
 * Esquema para a resposta de um convite individual
 * @constant {z.ZodObject} inviteResponseSchema
 */
export const inviteResponseSchema = z.object({
  id: z.string().uuid(),
  token: z.string(),
  email: z.string().email(),
  sender: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  status: z.nativeEnum(InviteStatus),
  expiresAt: z.string(),
  createdAt: z.string(),
  accounts: z.array(
    z.object({
      accountId: z.string().uuid(),
      accountName: z.string(),
      permission: z.nativeEnum(ResourcePermission),
    }),
  ),
});

/**
 * Tipo para o DTO de resposta de um convite
 */
export type InviteDTO = z.infer<typeof inviteResponseSchema>;

/**
 * Esquema para atualização do status de um convite (Aceitar/Rejeitar)
 * @constant {z.ZodObject} updateInviteStatusSchema
 */
export const updateInviteStatusSchema = z.object({
  status: z.enum([InviteStatus.ACCEPTED, InviteStatus.REJECTED]),
});

/**
 * Tipo para o payload de atualização de status do convite
 */
export type UpdateInviteStatusDTO = z.infer<typeof updateInviteStatusSchema>;
