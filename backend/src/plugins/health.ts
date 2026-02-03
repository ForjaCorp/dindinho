import { FastifyInstance } from "fastify";
import {
  ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { healthCheckSchema, HealthCheckDTO } from "@dindinho/shared";
import "@fastify/swagger";

export async function healthRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  typedApp.setValidatorCompiler(validatorCompiler);
  typedApp.setSerializerCompiler(serializerCompiler);

  // Health Check
  typedApp.get<{ Reply: HealthCheckDTO }>(
    "/health",
    {
      schema: {
        summary: "Verificar saúde da aplicação",
        tags: ["health"],
        response: {
          200: healthCheckSchema,
        },
      },
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
  typedApp.get(
    "/test-db",
    {
      schema: {
        summary: "Testar conexão com banco de dados",
        tags: ["health"],
      },
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
