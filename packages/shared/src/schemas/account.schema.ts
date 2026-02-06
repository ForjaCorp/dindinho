import { z } from "zod";
import { ResourcePermission } from "./auth.schema";

/**
 * Enum para tipos de conta disponíveis no sistema.
 * @example
 * const tipo = AccountTypeEnum.STANDARD;
 */
export const AccountTypeEnum = z.enum(["STANDARD", "CREDIT"]);

/**
 * Schema para criação de conta.
 * Usa 'refine' para exigir dados de cartão apenas se o tipo for CREDIT.
 * @param data - Dados da conta a ser criada
 * @returns Schema validado para criação de conta
 * @example
 * const accountData = {
 *   name: 'Cartão Nubank',
 *   color: '#8A2BE2',
 *   icon: 'pi-credit-card',
 *   type: 'CREDIT',
 *   closingDay: 10,
 *   dueDay: 15,
 *   limit: 5000,
 *   brand: 'Mastercard'
 * };
 * const result = createAccountSchema.parse(accountData);
 */
export const createAccountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string().min(4, "Cor inválida"),
  icon: z.string().min(1, "Ícone é obrigatório"),
  type: AccountTypeEnum.default("STANDARD"),

  initialBalance: z.coerce.number().optional().default(0),

  // Campos específicos para Cartão de Crédito
  closingDay: z.number().min(1).max(31).optional(),
  dueDay: z.number().min(1).max(31).optional(),
  limit: z.number().positive("Limite deve ser positivo").optional(),
  brand: z.string().optional(),
});

/**
 * Tipo para criação de conta usado como payload (input).
 */
export type CreateAccountDTO = z.input<typeof createAccountSchema>;

const optionalCoercedInt = (schema: z.ZodNumber) =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === "")
        return undefined;
      if (typeof value === "string") return Number(value);
      return value;
    }, schema)
    .optional();

const optionalCoercedNullableNumber = (schema: z.ZodNullable<z.ZodNumber>) =>
  z
    .preprocess((value) => {
      if (value === undefined) return undefined;
      if (value === "") return null;
      if (typeof value === "string") return Number(value);
      return value;
    }, schema)
    .optional();

const optionalTrimmedNullableString = (schema: z.ZodNullable<z.ZodString>) =>
  z
    .preprocess((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === "string" && value.trim() === "") return null;
      return value;
    }, schema)
    .optional();

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório").optional(),
    color: z.string().trim().min(4, "Cor inválida").optional(),
    icon: z.string().trim().min(1, "Ícone é obrigatório").optional(),
    closingDay: optionalCoercedInt(z.number().int().min(1).max(31)),
    dueDay: optionalCoercedInt(z.number().int().min(1).max(31)),
    limit: optionalCoercedNullableNumber(
      z.number().positive("Limite deve ser positivo").nullable(),
    ),
    brand: optionalTrimmedNullableString(z.string().trim().nullable()),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.color !== undefined ||
      data.icon !== undefined ||
      data.closingDay !== undefined ||
      data.dueDay !== undefined ||
      data.limit !== undefined ||
      data.brand !== undefined,
    {
      message: "Informe ao menos um campo para atualização",
    },
  );

export type UpdateAccountDTO = z.infer<typeof updateAccountSchema>;

/**
 * Schema de resposta para uma conta.
 * @param data - Dados completos da conta
 * @returns Schema validado para resposta de conta
 * @example
 * const accountResponse = {
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
 * const result = accountSchema.parse(accountResponse);
 */
export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  type: AccountTypeEnum,
  ownerId: z.string(),
  permission: z.nativeEnum(ResourcePermission).optional(),
  balance: z.coerce.number().optional().default(0),
  creditCardInfo: z
    .object({
      closingDay: z.number(),
      dueDay: z.number(),
      limit: z.number().nullable().optional(),
      availableLimit: z.number().nullable().optional(),
      brand: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Tipo para conta inferido do schema de resposta.
 */
export type AccountDTO = z.infer<typeof accountSchema>;
