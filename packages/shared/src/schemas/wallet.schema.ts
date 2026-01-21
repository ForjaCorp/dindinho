import { z } from "zod";

/**
 * Enum para tipos de carteira disponíveis no sistema.
 * @example
 * const tipo = WalletTypeEnum.STANDARD;
 */
export const WalletTypeEnum = z.enum(["STANDARD", "CREDIT"]);

/**
 * Schema para criação de carteira.
 * Usa 'refine' para exigir dados de cartão apenas se o tipo for CREDIT.
 * @param data - Dados da carteira a ser criada
 * @returns Schema validado para criação de carteira
 * @example
 * const walletData = {
 *   name: 'Cartão Nubank',
 *   color: '#8A2BE2',
 *   icon: 'pi-credit-card',
 *   type: 'CREDIT',
 *   closingDay: 10,
 *   dueDay: 15,
 *   limit: 5000,
 *   brand: 'Mastercard'
 * };
 * const result = createWalletSchema.parse(walletData);
 */
export const createWalletSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().min(4, "Cor inválida"),
  icon: z.string().min(1, "Ícone é obrigatório"),
  type: WalletTypeEnum.default("STANDARD"),

  // Campos específicos para Cartão de Crédito
  closingDay: z.number().min(1).max(31).optional(),
  dueDay: z.number().min(1).max(31).optional(),
  limit: z.number().positive("Limite deve ser positivo").optional(),
  brand: z.string().optional(),
});

/**
 * Tipo para criação de carteira inferido do schema.
 */
export type CreateWalletDTO = z.infer<typeof createWalletSchema>;

/**
 * Schema de resposta para uma carteira.
 * @param data - Dados completos da carteira
 * @returns Schema validado para resposta de carteira
 * @example
 * const walletResponse = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Cartão Nubank',
 *   color: '#8A2BE2',
 *   icon: 'pi-credit-card',
 *   type: 'CREDIT',
 *   ownerId: 'user-123',
 *   balance: 1500.50,
 *   creditCardInfo: {
 *     closingDay: 10,
 *     dueDay: 15,
 *     limit: 5000,
 *     brand: 'Mastercard'
 *   }
 * };
 * const result = walletSchema.parse(walletResponse);
 */
export const walletSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  type: WalletTypeEnum,
  ownerId: z.string(),
  balance: z.coerce.number().optional().default(0),
  creditCardInfo: z
    .object({
      closingDay: z.number(),
      dueDay: z.number(),
      limit: z.number().nullable().optional(),
      brand: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Tipo para carteira inferido do schema de resposta.
 */
export type WalletDTO = z.infer<typeof walletSchema>;
