import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthService } from "./auth.service";
import { loginSchema, loginResponseSchema } from "@dindinho/shared";

/**
 * Configura as rotas de autenticação da aplicação
 * @function authRoutes
 * @param {FastifyInstance} app - Instância do Fastify
 * @returns {Promise<void>}
 *
 * @example
 * // Uso típico no app.ts
 * import { authRoutes } from './auth/auth.routes';
 * // ...
 * app.register(authRoutes);
 */
export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(prisma);

  /**
   * Rota de autenticação de usuário
   * @name POST /login
   * @function
   * @memberof module:authRoutes
   * @inner
   * @param {Object} request.body - Dados de autenticação
   * @param {string} request.body.email - Email do usuário
   * @param {string} request.body.password - Senha do usuário
   * @returns {Object} Token JWT e dados do usuário autenticado
   * @throws {401} Credenciais inválidas
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
