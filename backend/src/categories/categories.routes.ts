import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  createCategorySchema,
  categorySchema,
  apiErrorResponseSchema,
} from "@dindinho/shared";
import { CategoriesService } from "./categories.service";
import { getHttpErrorLabel } from "../lib/get-http-error-label";
import { ForbiddenError, NotFoundError } from "../lib/domain-exceptions";

export async function categoriesRoutes(app: FastifyInstance) {
  const service = new CategoriesService(prisma);

  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      const statusCode = 401;
      return reply.code(statusCode).send({
        statusCode,
        error: getHttpErrorLabel(statusCode),
        message: "Token de autenticação inválido ou expirado.",
        code: "INVALID_TOKEN",
      });
    }
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        summary: "Listar categorias do usuário",
        tags: ["categories"],
        response: {
          200: z.array(categorySchema),
          401: apiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user;
      return service.findAllByUserId(userId);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar nova categoria",
        tags: ["categories"],
        body: createCategorySchema,
        response: {
          201: categorySchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = request.user;
      const payload = request.body;

      try {
        const category = await service.create(userId, payload);
        return reply.status(201).send(category);
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          const statusCode = error.statusCode;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code:
              error instanceof NotFoundError
                ? "PARENT_CATEGORY_NOT_FOUND"
                : "FORBIDDEN_PARENT_CATEGORY",
          });
        }
        throw error;
      }
    },
  );
}
