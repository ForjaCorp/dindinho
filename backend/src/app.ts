import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { usersRoutes } from "./users/users.routes";
import { authRoutes } from "./auth/auth.routes";
import { walletsRoutes } from "./wallets/wallets.routes";
import { ApiResponseDTO, HealthCheckDTO, DbTestDTO } from "@dindinho/shared";
import { prisma } from "./lib/prisma";
/**
 * Constrói e configura a aplicação Fastify
 * @function buildApp
 * @returns {FastifyInstance} Instância do Fastify configurada
 *
 * @example
 * // Uso típico no server.ts
 * const app = buildApp();
 * app.listen({ port: 3000 });
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  // Verificação de variáveis de ambiente obrigatórias
  if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET não definida no .env");
    process.exit(1);
  }
  // Configuração do Zod para validação e serialização
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // Plugins
  app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  // Configuração do JWT
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: "7d", // Token expira em 7 dias
    },
  });
  // Error Handler Global
  app.setErrorHandler((error: any, request, reply) => {
    // Erros de Validação Zod
    if (error instanceof Error && "validation" in error) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: error.message,
        issues: (error as any).validation,
      });
    }

    if (error instanceof SyntaxError) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "JSON inválido",
      });
    }

    // Erros com statusCode definido (ex: lançados manualmente ou pelo JWT)
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || "Error",
        message: error.message,
      });
    }

    // Erros não tratados
    app.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Erro interno do servidor",
    });
  });
  // Rotas da aplicação
  app.register(usersRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(walletsRoutes, { prefix: "/api/wallets" });
  // Rota raiz
  app.get<{ Reply: ApiResponseDTO }>("/", async () => {
    return {
      message: "Bem-vindo à API do Dindinho! 💸",
      docs: "Rotas disponíveis: POST /api/users, POST /api/login",
      endpoints: {
        health: "/health",
        test_db: "/test-db",
      },
    };
  });

  // Health endpoints
  app.get<{ Reply: HealthCheckDTO }>("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      app: "Dindinho API",
    };
  });

  app.get<{ Reply: DbTestDTO }>("/test-db", async () => {
    try {
      const usersCount = await prisma.user.count();
      return {
        success: true,
        message: "Prisma conectado com sucesso!",
        usersCount,
      };
    } catch (error) {
      app.log.error(error);
      return {
        success: false,
        error: "Erro na conexão via Prisma",
        details: String(error),
      };
    }
  });

  return app;
}
