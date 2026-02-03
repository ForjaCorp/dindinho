import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AccountsService } from "./accounts.service";
import {
  CreateAccountDTO,
  createAccountSchema,
  accountSchema,
  UpdateAccountDTO,
  updateAccountSchema,
  apiErrorResponseSchema,
} from "@dindinho/shared";
import { getHttpErrorLabel } from "../lib/get-http-error-label";
import { DuplicateAccountError } from "./accounts.service";

class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = "Sem permissão") {
    super(message);
  }
}

class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Recurso não encontrado") {
    super(message);
  }
}

/**
 * Rotas da API para gerenciamento de contas.
 *
 * @description
 * Define os endpoints para criação e listagem de contas dos usuários.
 * Todas as rotas requerem autenticação via JWT.
 *
 * @example
 * // Registrar rotas no app Fastify
 * app.register(accountsRoutes, { prefix: '/api/accounts' });
 *
 * @param app - Instância do Fastify para registrar as rotas
 */
export async function accountsRoutes(app: FastifyInstance) {
  /**
   * Instância do serviço de contas para operações de negócio.
   */
  const service = new AccountsService(prisma);

  /**
   * Hook global para este prefixo: verifica o token antes de qualquer handler.
   *
   * @description
   * Intercepta todas as requisições para este prefixo de rotas
   * e valida o token JWT. Lança erro 401 se o token for inválido.
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
   * Endpoint para criar uma nova conta.
   *
   * @description
   * Cria uma conta para o usuário autenticado. Suporta contas
   * padrão e cartões de crédito com informações específicas.
   *
   * @example
   * POST /api/accounts
   * {
   *   "name": "Cartão Nubank",
   *   "color": "#8A2BE2",
   *   "icon": "pi-credit-card",
   *   "type": "CREDIT",
   *   "closingDay": 10,
   *   "dueDay": 15,
   *   "limit": 5000,
   *   "brand": "Mastercard"
   * }
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
        if (error instanceof ForbiddenError || error instanceof NotFoundError) {
          const { statusCode } = error;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: error.constructor.name.replace(/Error$/, "").toUpperCase(),
          });
        }

        if (error instanceof DuplicateAccountError) {
          const duplicateError = error as DuplicateAccountError;
          return reply.code(409).send({
            statusCode: 409,
            error: getHttpErrorLabel(409),
            message: duplicateError.message,
            code: "DUPLICATE_ACCOUNT",
          });
        }

        // TODO: Improve error handling to map service errors
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
   * Endpoint para listar todas as contas do usuário.
   *
   * @description
   * Retorna todas as contas pertencentes ao usuário autenticado,
   * ordenadas por data de criação. Inclui informações de cartão
   * de crédito quando aplicável.
   *
   * @example
   * GET /api/accounts
   * Response: [
   *   {
   *     "id": "uuid",
   *     "name": "Cartão Nubank",
   *     "type": "CREDIT",
   *     "balance": 1500.50,
   *     "creditCardInfo": {
   *       "closingDay": 10,
   *       "dueDay": 15,
   *       "limit": 5000,
   *       "brand": "Mastercard"
   *     }
   *   }
   * ]
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
        return service.findAllByUserId(userId);
      } catch {
        // TODO: Improve error handling to map service errors
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
        return service.update(userId, id, payload);
      } catch (error) {
        if (error instanceof ForbiddenError || error instanceof NotFoundError) {
          const { statusCode } = error;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: error.constructor.name.replace(/Error$/, "").toUpperCase(),
          });
        }

        // TODO: Improve error handling to map service errors
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
