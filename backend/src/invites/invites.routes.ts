import { FastifyInstance, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import fastifyRateLimit from "@fastify/rate-limit";
import { prisma } from "../lib/prisma";
import { InvitesService, InviteError } from "./invites.service";
import {
  createInviteSchema,
  inviteResponseSchema,
  updateInviteStatusSchema,
  apiErrorResponseSchema,
} from "@dindinho/shared";
import { getHttpErrorLabel } from "../lib/get-http-error-label";
import { z } from "zod";

/**
 * Configura as rotas relacionadas a convites
 * @async
 * @function invitesRoutes
 */
export async function invitesRoutes(app: FastifyInstance) {
  const service = new InvitesService(prisma);

  /**
   * Configuração de Rate Limit para rotas de convite
   */
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.ENABLE_RATE_LIMIT_IN_TESTS === "true"
  ) {
    await app.register(fastifyRateLimit, {
      max: Number(process.env.INVITE_RATE_LIMIT_MAX ?? "20"),
      timeWindow: "1 minute",
      keyGenerator: (request) =>
        (request.headers["x-real-ip"] as string | undefined) || request.ip,
      errorResponseBuilder: (request, _context) => {
        const statusCode = 429;
        return {
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message:
            "Muitas tentativas de acesso aos convites. Tente novamente em 1 minuto.",
          code: "TOO_MANY_REQUESTS",
          requestId: request.id,
        };
      },
    });
  }

  const appZod = app.withTypeProvider<ZodTypeProvider>();

  /**
   * Rota pública para buscar convite pelo token
   * @route GET /api/invites/t/:token
   */
  appZod.get(
    "/t/:token",
    {
      schema: {
        summary: "Buscar convite pelo token",
        tags: ["invites"],
        params: z.object({ token: z.string() }),
        response: {
          200: inviteResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const invite = await service.getInviteByToken(token);
        return reply.send(invite);
      } catch (error) {
        return handleError(reply, error);
      }
    },
  );

  /**
   * Rotas protegidas
   */
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook("onRequest", async (request, reply) => {
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

    const protectedZod = protectedRoutes.withTypeProvider<ZodTypeProvider>();

    /**
     * Rota para criação de novo convite
     * @route POST /api/invites
     */
    protectedZod.post(
      "/",
      {
        schema: {
          summary: "Criar convite",
          tags: ["invites"],
          body: createInviteSchema,
          response: {
            201: inviteResponseSchema,
            400: apiErrorResponseSchema,
            401: apiErrorResponseSchema,
            403: apiErrorResponseSchema,
            500: apiErrorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const { sub: userId } = request.user as { sub: string };
          const invite = await service.createInvite(userId, request.body);
          return reply.status(201).send(invite);
        } catch (error) {
          return handleError(reply, error);
        }
      },
    );

    /**
     * Lista convites enviados
     * @route GET /api/invites/sent
     */
    protectedZod.get(
      "/sent",
      {
        schema: {
          summary: "Listar convites enviados",
          tags: ["invites"],
          response: {
            200: z.array(inviteResponseSchema),
            401: apiErrorResponseSchema,
            500: apiErrorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const { sub: userId } = request.user as { sub: string };
          const invites = await service.listSentInvites(userId);
          return reply.send(invites);
        } catch (error) {
          return handleError(reply, error);
        }
      },
    );

    /**
     * Lista convites recebidos
     * @route GET /api/invites/pending
     */
    protectedZod.get(
      "/pending",
      {
        schema: {
          summary: "Listar convites pendentes",
          tags: ["invites"],
          response: {
            200: z.array(inviteResponseSchema),
            401: apiErrorResponseSchema,
            500: apiErrorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const { email } = request.user as { email: string };
          const invites = await service.listReceivedInvites(email);
          return reply.send(invites);
        } catch (error) {
          return handleError(reply, error);
        }
      },
    );

    /**
     * Atualiza status de um convite (Aceitar/Rejeitar)
     * @route PATCH /api/invites/:id
     */
    protectedZod.patch(
      "/:id",
      {
        schema: {
          summary: "Atualizar status do convite",
          tags: ["invites"],
          params: z.object({ id: z.string().uuid() }),
          body: updateInviteStatusSchema,
          response: {
            200: inviteResponseSchema,
            400: apiErrorResponseSchema,
            401: apiErrorResponseSchema,
            403: apiErrorResponseSchema,
            404: apiErrorResponseSchema,
            500: apiErrorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const { sub: userId, email } = request.user as {
            sub: string;
            email: string;
          };
          const { id } = request.params as { id: string };
          const invite = await service.updateInviteStatus(
            userId,
            email,
            id,
            request.body,
          );
          return reply.send(invite);
        } catch (error) {
          return handleError(reply, error);
        }
      },
    );

    /**
     * Remove um convite enviado
     * @route DELETE /api/invites/:id
     */
    protectedZod.delete(
      "/:id",
      {
        schema: {
          summary: "Remover convite",
          tags: ["invites"],
          params: z.object({ id: z.string().uuid() }),
          response: {
            204: z.null(),
            401: apiErrorResponseSchema,
            403: apiErrorResponseSchema,
            404: apiErrorResponseSchema,
            500: apiErrorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        try {
          const { sub: userId } = request.user as { sub: string };
          const { id } = request.params as { id: string };
          await service.deleteInvite(userId, id);
          return reply.status(204).send(null);
        } catch (error) {
          return handleError(reply, error);
        }
      },
    );
  });
}

/**
 * Centraliza o tratamento de erros do serviço de convites
 */
function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof InviteError) {
    const statusCode = error.statusCode;
    return reply.code(statusCode).send({
      statusCode,
      error: getHttpErrorLabel(statusCode),
      message: error.message,
      code: error.code,
    });
  }

  const statusCode = 500;
  return reply.code(statusCode).send({
    statusCode,
    error: getHttpErrorLabel(statusCode),
    message:
      error instanceof Error ? error.message : "Erro interno do servidor",
    code: "INTERNAL_SERVER_ERROR",
  });
}
