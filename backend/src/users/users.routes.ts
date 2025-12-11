import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { UsersService, createUserSchema } from "./users.service";

/**
 * Configura as rotas relacionadas a usuários
 * @async
 * @function usersRoutes
 * @param {FastifyInstance} app - Instância do Fastify
 * @returns {Promise<void>}
 *
 * @example
 * // No seu arquivo server.ts:
 * import { usersRoutes } from './users/users.routes';
 *
 * const app = fastify();
 * await usersRoutes(app);
 */
export async function usersRoutes(app: FastifyInstance) {
  const service = new UsersService(prisma);

  /**
   * Rota POST /users - Cria um novo usuário
   * @name post/users
   * @function
   * @memberof module:usersRoutes
   * @inner
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/users",
    {
      schema: {
        summary: "Criar novo usuário",
        tags: ["users"],
        body: createUserSchema,
        response: {
          201: z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string().email(),
            createdAt: z.string().datetime(),
          }),
          409: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body as {
        name: string;
        email: string;
        password: string;
      };

      try {
        const user = await service.create({ name, email, password });
        return reply.status(201).send({
          ...user,
          createdAt: user.createdAt.toISOString(),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Email já cadastrado."
        ) {
          return reply.status(409).send({ message: error.message });
        }
        throw error;
      }
    },
  );
}
