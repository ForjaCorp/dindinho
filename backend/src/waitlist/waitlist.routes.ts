import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { WaitlistService } from "./waitlist.service";
import { createWaitlistSchema } from "@dindinho/shared";

/**
 * Configura as rotas relacionadas à lista de espera.
 * @async
 * @function waitlistRoutes
 * @param {FastifyInstance} app - Instância do Fastify
 */
export async function waitlistRoutes(app: FastifyInstance) {
  const service = new WaitlistService(prisma);

  /**
   * Rota para solicitar convite (entrar na waitlist).
   * @route POST /waitlist
   * @description Recebe dados de contato para lista de espera
   * @access Public
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/waitlist",
    {
      schema: {
        summary: "Entrar na lista de espera",
        tags: ["waitlist"],
        body: createWaitlistSchema,
        response: {
          201: z.object({
            message: z.string(),
          }),
          409: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        await service.join(request.body);
        return reply.status(201).send({
          message:
            "Solicitação recebida com sucesso! Em breve entraremos em contato.",
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Email já está na lista de espera."
        ) {
          return reply.status(409).send({ message: error.message });
        }
        throw error;
      }
    },
  );
}
