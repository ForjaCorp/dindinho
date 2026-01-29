import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

/**
 * Esquema de validação para criação de usuário
 * @constant {z.ZodObject} createUserSchema
 * @property {string} name - Nome do usuário (mínimo 2 caracteres)
 * @property {string} email - Email válido
 * @property {string} phone - Telefone válido (formato internacional)
 * @property {string} password - Senha (mínimo 6 caracteres)
 *
 * @example
 * // Exemplo de uso:
 * const userData = {
 *   name: "João Silva",
 *   email: "joao@example.com",
 *   phone: "+5511999999999",
 *   password: "senha123"
 * };
 * const validatedData = createUserSchema.parse(userData);
 */
export const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine((val) => isValidPhoneNumber(val), {
      message: "Telefone inválido",
    }),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(
      /[^A-Za-z0-9]/,
      "Senha deve conter pelo menos um caractere especial",
    ),
});

/**
 * Tipo TypeScript derivado do schema de validação
 * @typedef {Object} CreateUserDTO
 * @property {string} name - Nome do usuário
 * @property {string} email - Email do usuário
 * @property {string} phone - Telefone do usuário
 * @property {string} password - Senha do usuário (texto plano, será hasheada antes de salvar)
 *
 * @example
 * // Exemplo de uso:
 * function createUser(userData: CreateUserDTO) {
 *   // Implementação da criação do usuário
 * }
 */
export type CreateUserDTO = z.infer<typeof createUserSchema>;
