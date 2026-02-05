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
import {
  AuthService,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UserNotFoundError,
} from "./auth.service";
import { RefreshTokenService } from "./refresh-token.service";
import {
  LoginResponseDTO,
  loginSchema,
  loginResponseSchema,
  apiErrorResponseSchema,
  refreshTokenSchema,
  refreshTokenResponseSchema,
  RefreshTokenResponseDTO,
} from "@dindinho/shared";
import fastifyRateLimit from "@fastify/rate-limit";
import { getHttpErrorLabel } from "../lib/get-http-error-label";

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

  app.withTypeProvider<ZodTypeProvider>().post(
    "/login",
    {
      schema: {
        summary: "Autenticar usuário",
        tags: ["auth"],
        body: loginSchema,
        response: {
          200: loginResponseSchema,
          401: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        const authResult = await service.authenticate({ email, password });

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
          error instanceof InvalidCredentialsError ||
          error instanceof UserNotFoundError
        ) {
          const statusCode = error.statusCode;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: "INVALID_CREDENTIALS",
          });
        }
        throw error;
      }
    },
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/refresh",
    {
      schema: {
        summary: "Atualizar token de acesso",
        description:
          "Gera um novo token de acesso e um novo refresh token a partir de um refresh token válido.",
        tags: ["auth"],
        body: refreshTokenSchema,
        response: {
          200: refreshTokenResponseSchema,
          401: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        const { newRefreshToken, newAccessToken } =
          await service.refreshToken(refreshToken);

        const response: RefreshTokenResponseDTO = {
          token: newAccessToken,
          refreshToken: newRefreshToken,
        };

        return reply.status(200).send(response);
      } catch (error) {
        if (error instanceof InvalidRefreshTokenError) {
          const statusCode = error.statusCode;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: "INVALID_REFRESH_TOKEN",
          });
        }

        throw error;
      }
    },
  );

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
          204: z.object({}).describe("No content"),
          401: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      const revoked = await service.revokeRefreshToken(refreshToken);

      if (!revoked) {
        const statusCode = 401;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Refresh token inválido.",
          code: "INVALID_REFRESH_TOKEN",
        });
      }

      return reply.status(204).send({});
    },
  );
}
