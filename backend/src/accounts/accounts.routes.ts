/**
 * @file Rotas de contas da aplicação
 * @description Define os endpoints para criação, listagem e atualização de contas bancárias e cartões
 * @module accounts.routes
 */

import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AccountsService, AccountError } from "./accounts.service";
import {
  CreateAccountDTO,
  createAccountSchema,
  accountSchema,
  UpdateAccountDTO,
  updateAccountSchema,
  apiErrorResponseSchema,
} from "@dindinho/shared";
import { getHttpErrorLabel } from "../lib/get-http-error-label";

/**
 * Configura as rotas relacionadas a contas
 * @async
 * @function accountsRoutes
 * @description Registra os endpoints de gestão de contas na instância do Fastify
 * @param {FastifyInstance} app - Instância do Fastify onde as rotas serão registradas
 * @returns {Promise<void>} Promise vazia após configuração das rotas
 */
export async function accountsRoutes(app: FastifyInstance) {
  const service = new AccountsService(prisma);

  /**
   * Hook global para este prefixo: verifica o token antes de qualquer handler.
   */
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      const statusCode = 401;
      return reply.code(statusCode).send({
        statusCode,
        error: getHttpErrorLabel(statusCode),
        message: "Token inválido ou expirado",
        code: "INVALID_TOKEN",
      });
    }
  });

  /**
   * Rota para criação de nova conta ou cartão
   * @route POST /api/accounts
   * @description Cria uma nova conta bancária ou cartão de crédito para o usuário autenticado
   * @access Private
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar conta",
        tags: ["accounts"],
        body: createAccountSchema,
        response: {
          201: accountSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const payload: CreateAccountDTO = createAccountSchema.parse(
          request.body,
        );
        const account = await service.create(userId, payload);
        return reply.status(201).send(account);
      } catch (error) {
        if (error instanceof AccountError) {
          const statusCode = error.statusCode as
            | 401
            | 403
            | 404
            | 409
            | 422
            | 500;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code:
              typeof error.details === "object" &&
              error.details !== null &&
              "code" in error.details &&
              typeof (error.details as { code: unknown }).code === "string"
                ? (error.details as { code: string }).code
                : "ACCOUNT_ERROR",
          });
        }

        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );

  /**
   * Rota para listagem de contas do usuário
   * @route GET /api/accounts
   * @description Retorna todas as contas pertencentes ao usuário autenticado
   * @access Private
   */
  app.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        summary: "Listar contas",
        tags: ["accounts"],
        response: {
          200: z.array(accountSchema),
          401: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        return await service.findAllByUserId(userId);
      } catch (error) {
        if (error instanceof AccountError) {
          const statusCode = error.statusCode as 200 | 401 | 500;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code:
              typeof error.details === "object" &&
              error.details !== null &&
              "code" in error.details &&
              typeof (error.details as { code: unknown }).code === "string"
                ? (error.details as { code: string }).code
                : "ACCOUNT_ERROR",
          });
        }

        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );

  const paramsSchema = z.object({
    id: z.string().uuid(),
  });

  /**
   * Rota para atualização de dados da conta
   * @route PATCH /api/accounts/:id
   * @description Atualiza as informações de uma conta ou cartão existente
   * @access Private
   */
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/:id",
    {
      schema: {
        summary: "Atualizar conta",
        tags: ["accounts"],
        params: paramsSchema,
        body: updateAccountSchema,
        response: {
          200: accountSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { sub: userId } = request.user as { sub: string };
        const { id } = paramsSchema.parse(request.params);
        const payload: UpdateAccountDTO = updateAccountSchema.parse(
          request.body,
        );
        return await service.update(userId, id, payload);
      } catch (error) {
        if (error instanceof AccountError) {
          const statusCode = error.statusCode as
            | 200
            | 404
            | 401
            | 403
            | 409
            | 422
            | 500;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code:
              typeof error.details === "object" &&
              error.details !== null &&
              "code" in error.details &&
              typeof (error.details as { code: unknown }).code === "string"
                ? (error.details as { code: string }).code
                : "ACCOUNT_ERROR",
          });
        }

        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );
}
