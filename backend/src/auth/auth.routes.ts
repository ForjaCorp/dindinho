/**
 * @file Rotas de autenticação da aplicação
 * @description Define os endpoints para autenticação de usuários, incluindo login e geração de tokens JWT
 * @module auth.routes
 * @requires fastify
 * @requires fastify-type-provider-zod
 * @requires zod
 * @requires ../lib/prisma
 * @requires ./auth.service
 * @requires @dindinho/shared
 */

import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthService } from "./auth.service";
import { loginSchema, loginResponseSchema } from "@dindinho/shared";

/**
 * Configura as rotas de autenticação da aplicação
 * @function authRoutes
 * @description Registra os endpoints de autenticação na instância do Fastify
 * @param {FastifyInstance} app - Instância do Fastify onde as rotas serão registradas
 * @returns {Promise<void>} Promise vazia após configuração das rotas
 * @throws {Error} Pode propagar erros do serviço de autenticação
 *
 * @example
 * // Uso típico no app.ts
 * import { authRoutes } from './auth/auth.routes';
 * // ...
 * await app.register(authRoutes);
 *
 * @since 1.0.0
 * @author Dindinho Team
 */
export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(prisma);

  /**
   * Rota de autenticação de usuário via login
   * @route POST /api/login
   * @description Autentica um usuário com email e senha, retornando um token JWT
   * @access Public
   * @param {Object} request.body - Dados de autenticação
   * @param {string} request.body.email - Email do usuário (deve ser válido e existir)
   * @param {string} request.body.password - Senha do usuário (mínimo 6 caracteres)
   * @returns {Promise<Object>} Token JWT e dados do usuário autenticado
   * @returns {string} returns.token - Token JWT para autenticação em requisições futuras
   * @returns {Object} returns.user - Dados básicos do usuário (id, name, email)
   * @throws {401} Retorna quando as credenciais são inválidas
   * @throws {400} Retorna quando os dados de entrada são inválidos
   * @throws {500} Retorna quando ocorre erro interno do servidor
   *
   * @example
   * // Request body:
   * {
   *   "email": "usuario@exemplo.com",
   *   "password": "senha123"
   * }
   *
   * // Response 200:
   * {
   *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
   *   "user": {
   *     "id": "uuid-do-usuario",
   *     "name": "Nome do Usuário",
   *     "email": "usuario@exemplo.com"
   *   }
   * }
   *
   * // Response 401:
   * {
   *   "message": "Credenciais inválidas."
   * }
   *
   * @since 1.0.0
   * @see {@link https://jwt.io/} Para entender o formato do token JWT
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/login",
    {
      schema: {
        summary: "Autenticar usuário",
        tags: ["auth"],
        body: loginSchema,
        response: {
          200: loginResponseSchema,
          401: z.object({
            message: z.string().describe("Mensagem de erro de autenticação"),
          }),
        },
      },
    },
    async (request, reply) => {
      // O cast 'as LoginDTO' ajuda o TS a inferir corretamente do shared
      const { email, password } = request.body;

      try {
        const user = await service.authenticate({ email, password });

        // Gera o Token JWT (expira em 7 dias)
        const token = app.jwt.sign(
          { name: user.name, email: user.email },
          { sub: user.id, expiresIn: "7d" },
        );

        return reply.status(200).send({ token, user });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Credenciais inválidas."
        ) {
          return reply.status(401).send({ message: error.message });
        }
        throw error;
      }
    },
  );
}
