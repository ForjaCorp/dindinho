import Fastify, { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { usersRoutes } from "./users/users.routes";
import { authRoutes } from "./auth/auth.routes";
import { walletsRoutes } from "./wallets/wallets.routes";
import { transactionsRoutes } from "./transactions/transactions.routes";
import { categoriesRoutes } from "./categories/categories.routes";
import { RefreshTokenService } from "./auth/refresh-token.service";
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
  // Configuração CORS seguro
  const allowedOrigins = [
    "http://localhost:4200", // Angular dev default
    "http://localhost:4201", // Angular dev alternative
    "http://127.0.0.1:4200", // Angular dev IP default
    "http://127.0.0.1:4201", // Angular dev IP alternative
    "http://localhost:3333", // Backend local
    process.env.FRONTEND_URL, // Produção
  ].filter((origin): origin is string => Boolean(origin));

  app.register(cors, {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  // Configuração do JWT
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: "15m", // Access Token expira em 15 minutos
    },
  });
  // Error Handler Global
  app.setErrorHandler((error: unknown, request, reply) => {
    // Erros de Validação Zod
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: error.message,
        issues: error.issues,
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
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      const e = error as {
        statusCode: number;
        name?: string;
        message?: string;
      };
      return reply.status(e.statusCode).send({
        statusCode: e.statusCode,
        error: e.name || "Error",
        message: e.message,
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

  // Instancia o RefreshTokenService com o logger da aplicação
  const refreshTokenService = new RefreshTokenService(prisma, app.log);

  // Agendar limpeza de tokens expirados se habilitado via env
  if (process.env.ENABLE_REFRESH_CLEANUP === "true") {
    const intervalMinutes = parseInt(
      process.env.REFRESH_CLEANUP_INTERVAL_MINUTES ?? "60",
      10,
    );
    const ms = Math.max(1000 * 60, intervalMinutes * 60 * 1000);
    setInterval(async () => {
      try {
        await refreshTokenService.cleanupExpiredTokens();
      } catch (err) {
        app.log.error({
          err,
          message: "Falha ao limpar tokens de refresh expirados",
        });
      }
    }, ms);
    app.log.info(
      `Limpeza de tokens de refresh agendada a cada ${intervalMinutes} minutos`,
    );
  }

  app.register(authRoutes, { prefix: "/api", refreshTokenService });
  app.register(walletsRoutes, { prefix: "/api/wallets" });
  app.register(transactionsRoutes, { prefix: "/api/transactions" });
  app.register(categoriesRoutes, { prefix: "/api/categories" });
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
