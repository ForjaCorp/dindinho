import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { apiErrorResponseSchema } from "@dindinho/shared";
import { getHttpErrorLabel } from "../lib/get-http-error-label";
import { SignupAllowlistService } from "./signup-allowlist.service";

const emailSchema = z.string().email();

const allowlistItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export async function signupAllowlistRoutes(app: FastifyInstance) {
  const service = new SignupAllowlistService(prisma);

  app.addHook("onRequest", async (request, reply) => {
    const adminKey = request.headers["x-admin-key"];
    if (adminKey === process.env.ALLOWLIST_ADMIN_KEY) {
      return;
    }
    await app.authenticateAdmin(request, reply);
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        summary: "Listar emails liberados para cadastro",
        tags: ["signup-allowlist"],
        response: {
          200: z.array(allowlistItemSchema),
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
        },
      },
    },
    async () => {
      return service.list();
    },
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Adicionar email na lista de permissão",
        tags: ["signup-allowlist"],
        body: z.object({ email: emailSchema }),
        response: {
          201: allowlistItemSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body;

      try {
        const item = await service.add(email);
        return reply.status(201).send(item);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: unknown }).code === "P2002"
        ) {
          const statusCode = 409;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: "O e-mail fornecido já está na lista de permissão.",
            code: "EMAIL_ALREADY_IN_ALLOWLIST",
          });
        }

        request.log.error(
          { err: error },
          "Erro ao adicionar email na allowlist",
        );
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );

  app.withTypeProvider<ZodTypeProvider>().delete(
    "/:email",
    {
      schema: {
        summary: "Remover email da lista de permissão",
        tags: ["signup-allowlist"],
        params: z.object({ email: emailSchema }),
        response: {
          200: z.object({ deleted: z.boolean() }),
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { email } = request.params;
        const deleted = await service.remove(email);

        if (!deleted) {
          const statusCode = 404;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message:
              "O e-mail fornecido não foi encontrado na lista de permissão.",
            code: "EMAIL_NOT_FOUND_IN_ALLOWLIST",
          });
        }

        return reply.status(200).send({ deleted: true });
      } catch (error) {
        request.log.error({ err: error }, "Erro ao remover email da allowlist");
        const statusCode = 500;
        return reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Erro interno do servidor.",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );
}
