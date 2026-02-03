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

/**
 * Esquema de validação para a solicitação de atualização de token
 * @constant {z.ZodObject} refreshTokenSchema
 * @property {string} refreshToken - O refresh token recebido durante o login
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token é obrigatório"),
});

/**
 * Tipo TypeScript derivado do schema de atualização de token
 * @typedef {Object} RefreshTokenDTO
 * @property {string} refreshToken - O refresh token
 */
export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;

/**
 * Esquema de validação para a resposta da atualização de token
 * @constant {z.ZodObject} refreshTokenResponseSchema
 * @property {string} token - O novo token JWT de acesso
 * @property {string} refreshToken - O novo refresh token
 */
export const refreshTokenResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
});

/**
 * Tipo TypeScript para a resposta de atualização de token
 * @typedef {Object} RefreshTokenResponseDTO
 * @property {string} token - O novo token JWT de acesso
 * @property {string} refreshToken - O novo refresh token
 */
export type RefreshTokenResponseDTO = z.infer<
  typeof refreshTokenResponseSchema
>;
