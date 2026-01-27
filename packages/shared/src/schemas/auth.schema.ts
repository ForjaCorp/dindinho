import { z } from "zod";

/**
 * Esquema de validação para autenticação de usuário
 * @constant {z.ZodObject} loginSchema
 * @property {string} email - Email do usuário (deve ser um email válido)
 * @property {string} password - Senha do usuário (campo obrigatório)
 *
 * @example
 * // Exemplo de uso:
 * const loginData = {
 *   email: "usuario@exemplo.com",
 *   password: "senha-segura"
 * };
 * const validatedData = loginSchema.parse(loginData);
 */
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

/**
 * Tipo TypeScript derivado do schema de login
 * @typedef {Object} LoginDTO
 * @property {string} email - Email do usuário
 * @property {string} password - Senha do usuário
 */
export type LoginDTO = z.infer<typeof loginSchema>;

/**
 * Esquema de validação para a resposta de autenticação
 * @constant {z.ZodObject} loginResponseSchema
 * @property {string} token - Token JWT para autenticação
 * @property {Object} user - Dados do usuário autenticado
 * @property {string} user.id - ID do usuário
 * @property {string} user.name - Nome do usuário
 * @property {string} user.email - Email do usuário
 *
 * @example
 * // Exemplo de resposta da API:
 * {
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   user: {
 *     id: "123e4567-e89b-12d3-a456-426614174000",
 *     name: "João Silva",
 *     email: "joao@exemplo.com"
 *   }
 * }
 */
export const loginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["VIEWER", "EDITOR", "ADMIN"]),
  }),
});

/**
 * Tipo TypeScript para a resposta de autenticação
 * @typedef {Object} LoginResponseDTO
 * @property {string} token - Token JWT para autenticação
 * @property {Object} user - Dados do usuário autenticado
 * @property {string} user.id - ID do usuário
 * @property {string} user.name - Nome do usuário
 * @property {string} user.email - Email do usuário
 */
export type LoginResponseDTO = z.infer<typeof loginResponseSchema>;
