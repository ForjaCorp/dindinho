import { FastifyInstance, FastifySchema } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { healthCheckSchema, HealthCheckDTO } from "@dindinho/shared";

interface SwaggerSchema extends FastifySchema {
  summary: string;
  tags: string[];
}

export async function healthRoutes(app: FastifyInstance) {
  // Health Check
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        summary: "Verificar saúde da aplicação",
        tags: ["health"],
        response: {
          200: healthCheckSchema,
        },
      } as SwaggerSchema,
    },
    async (_request, reply) => {
      const data: HealthCheckDTO = {
        status: "ok",
        app: "dindinho-backend",
        timestamp: new Date(),
      };
      return reply.send(data);
    },
  );

  // Test Database Connection
  app.withTypeProvider<ZodTypeProvider>().get(
    "/test-db",
    {
      schema: {
        summary: "Testar conexão com banco de dados",
        tags: ["health"],
      } as SwaggerSchema,
    },
    async (_request, reply) => {
      try {
        const usersCount = await prisma.user.count();
        return reply.send({
          success: true,
          message: "Prisma conectado com sucesso!",
          usersCount,
        });
      } catch (error) {
        return reply.send({
          success: false,
          error: "Erro na conexão via Prisma",
          details: String(error),
        });
      }
    },
  );
}
