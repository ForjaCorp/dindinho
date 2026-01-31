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
import { RefreshTokenService } from "./refresh-token.service";
import {
  LoginDTO,
  LoginResponseDTO,
  loginSchema,
  loginResponseSchema,
} from "@dindinho/shared";
import fastifyRateLimit from "@fastify/rate-limit";

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
export async function authRoutes(
  app: FastifyInstance,
  opts: { refreshTokenService?: RefreshTokenService } = {},
) {
  const refreshTokenService =
    opts.refreshTokenService ?? new RefreshTokenService(prisma, app.log);
  const service = new AuthService(prisma, refreshTokenService);

  await app.register(fastifyRateLimit, {
    global: true,
    hook: "onRequest",
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? "10"),
    timeWindow: /^[0-9]+$/.test(process.env.LOGIN_RATE_LIMIT_TIME_WINDOW || "")
      ? Number(process.env.LOGIN_RATE_LIMIT_TIME_WINDOW)
      : (process.env.LOGIN_RATE_LIMIT_TIME_WINDOW ?? "1 minute"),
    keyGenerator: (request) =>
      (request.headers["x-real-ip"] as string | undefined) || request.ip,
  });

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
      const { email, password } = request.body as LoginDTO;

      try {
        const authResult = await service.authenticate({ email, password });

        // Gera o Access Token JWT (expira em 15 minutos)
        const token = app.jwt.sign(
          {
            name: authResult.name,
            email: authResult.email,
            role: authResult.role,
          },
          { sub: authResult.id, expiresIn: "15m" },
        );

        const response: LoginResponseDTO = {
          token,
          refreshToken: authResult.refreshToken,
          user: {
            id: authResult.id,
            name: authResult.name,
            email: authResult.email,
            role: authResult.role,
          },
        };

        return reply.status(200).send(response);
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

  /**
   * Rota de refresh token
   * @route POST /api/refresh
   * @description Renova o access token usando um refresh token válido
   * @access Public
   * @param {Object} request.body - Dados de refresh
   * @param {string} request.body.refreshToken - Refresh token válido
   * @returns {Promise<Object>} Novo access token e refresh token
   * @throws {401} Retorna quando o refresh token é inválido ou expirado
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/refresh",
    {
      schema: {
        summary: "Renovar token de acesso",
        tags: ["auth"],
        body: z.object({
          refreshToken: z.string().min(1, "Refresh token é obrigatório"),
        }),
        response: {
          200: z.object({
            token: z.string().describe("Novo access token JWT"),
            refreshToken: z.string().describe("Novo refresh token"),
          }),
          401: z.object({
            message: z.string().describe("Mensagem de erro"),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        // Valida o refresh token
        const userId = await service.validateRefreshToken(refreshToken);

        if (!userId) {
          return reply.status(401).send({
            message: "Refresh token inválido ou expirado",
          });
        }

        // Busca dados do usuário
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, role: true },
        });

        if (!user) {
          return reply.status(401).send({
            message: "Usuário não encontrado",
          });
        }

        // Gera novo access token (15min)
        const newToken = app.jwt.sign(
          { name: user.name, email: user.email, role: user.role },
          { sub: user.id, expiresIn: "15m" },
        );

        // Gera novo refresh token (rotação)
        const newRefreshToken = await refreshTokenService.createToken(user.id);

        // Revoga o token antigo
        await service.revokeRefreshToken(refreshToken);

        return reply.status(200).send({
          token: newToken,
          refreshToken: newRefreshToken,
        });
      } catch {
        return reply.status(401).send({
          message: "Erro ao renovar token",
        });
      }
    },
  );

  /**
   * Rota de logout
   * @route POST /api/logout
   * @description Revoga um refresh token (logout)
   * @access Public
   * @param {Object} request.body - Dados de logout
   * @param {string} request.body.refreshToken - Refresh token a revogar
   * @returns {Promise<Object>} Mensagem de sucesso
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/logout",
    {
      schema: {
        summary: "Logout do usuário",
        tags: ["auth"],
        body: z.object({
          refreshToken: z.string().min(1, "Refresh token é obrigatório"),
        }),
        response: {
          200: z.object({
            message: z.string().describe("Mensagem de sucesso"),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      await service.revokeRefreshToken(refreshToken);

      return reply.status(200).send({
        message: "Logout realizado com sucesso",
      });
    },
  );
}
