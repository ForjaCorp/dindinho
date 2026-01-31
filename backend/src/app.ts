import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { usersRoutes } from "./users/users.routes";
import { authRoutes } from "./auth/auth.routes";
import { accountsRoutes } from "./accounts/accounts.routes";
import { transactionsRoutes } from "./transactions/transactions.routes";
import { categoriesRoutes } from "./categories/categories.routes";
import { signupAllowlistRoutes } from "./signup-allowlist/signup-allowlist.routes";
import { waitlistRoutes } from "./waitlist/waitlist.routes";
import { reportsRoutes } from "./reports/reports.routes";
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
  const level =
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "production" ? "info" : "debug");
  const app = Fastify({
    logger: {
      level,
      base: {
        app: "dindinho-backend",
        env: process.env.NODE_ENV ?? "development",
      },
      redact: [
        "req.headers.authorization",
        "request.headers.authorization",
        "headers.authorization",
        "req.headers.cookie",
        "request.headers.cookie",
        "response.headers.set-cookie",
        "req.body.password",
        "request.body.password",
        "req.body.refreshToken",
        "request.body.refreshToken",
      ],
    },
    genReqId: (request) => {
      const hdr = request.headers["x-request-id"];
      if (typeof hdr === "string" && hdr.length > 0) return hdr;
      return `req-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    },
    trustProxy: process.env.TRUST_PROXY === "true",
  });
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
    "http://localhost:5173", // Vite dev default
    "http://localhost:5174", // Vite dev alternative
    "http://127.0.0.1:5173", // Vite dev IP default
    "http://127.0.0.1:5174", // Vite dev IP alternative
    "http://localhost:3333", // Backend local
    process.env.FRONTEND_URL, // Produção
  ].filter((origin): origin is string => Boolean(origin));

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
    credentials: true,
  });
  // Configuração do JWT
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: "15m", // Access Token expira em 15 minutos
    },
  });

  app.register(fastifyRateLimit, {
    global: true,
    hook: "onRequest",
    max: Number(process.env.RATE_LIMIT_MAX ?? "100"),
    timeWindow: /^[0-9]+$/.test(process.env.RATE_LIMIT_TIME_WINDOW || "")
      ? Number(process.env.RATE_LIMIT_TIME_WINDOW)
      : (process.env.RATE_LIMIT_TIME_WINDOW ?? "1 minute"),
    allowList: (process.env.RATE_LIMIT_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter((v) => v.length > 0),
    skipOnError: true,
    keyGenerator: (request: FastifyRequest) =>
      (request.headers["x-real-ip"] as string | undefined) || request.ip,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });

  app.register(underPressure, {
    maxEventLoopDelay: Number(process.env.MAX_EVENT_LOOP_DELAY_MS ?? "1000"),
    maxHeapUsedBytes: Number(process.env.MAX_HEAP_USED_BYTES ?? "200000000"),
    maxRssBytes: Number(process.env.MAX_RSS_BYTES ?? "300000000"),
    message: "Under pressure!",
    retryAfter: 30,
    healthCheckInterval: Number(process.env.HEALTHCHECK_INTERVAL_MS ?? "5000"),
    healthCheck: async () => true,
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

    // Rate limit exceeded (429)
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      (error as { statusCode: number }).statusCode === 429
    ) {
      return reply.status(429).send({
        statusCode: 429,
        error: "Too Many Requests",
        message: "Limite de requisições excedido, tente novamente mais tarde",
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
    app.log.error({ err: error, reqId: request.id });
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Erro interno do servidor",
    });
  });
  // Rotas da aplicação
  app.register(usersRoutes, { prefix: "/api" });
  app.register(signupAllowlistRoutes, { prefix: "/api" });
  app.register(waitlistRoutes, { prefix: "/api" });
  app.register(reportsRoutes, { prefix: "/api" });

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
  app.register(accountsRoutes, { prefix: "/api/accounts" });
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
  const healthRateLimiter = (() => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const max = Number(process.env.RATE_LIMIT_MAX ?? "100");
    const twRaw = process.env.RATE_LIMIT_TIME_WINDOW ?? "60000";
    const timeWindow = /^[0-9]+$/.test(twRaw) ? Number(twRaw) : 60000;
    const allowlist = (process.env.RATE_LIMIT_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter((v) => v.length > 0);
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const ip =
        (request.headers["x-real-ip"] as string | undefined) || request.ip;
      if (allowlist.includes(ip)) {
        return;
      }
      const now = Date.now();
      const entry = store.get(ip) ?? { count: 0, resetAt: now + timeWindow };
      if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + timeWindow;
      }
      if (entry.count >= max) {
        return reply.status(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Limite de requisições excedido, tente novamente mais tarde",
        });
      }
      entry.count++;
      store.set(ip, entry);
    };
  })();

  const buildHealthPayload = (): HealthCheckDTO => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    app: "Dindinho API",
  });

  app.get<{ Reply: HealthCheckDTO }>(
    "/health",
    { preHandler: healthRateLimiter },
    async () => buildHealthPayload(),
  );

  app.get<{ Reply: HealthCheckDTO }>(
    "/api/health",
    { preHandler: healthRateLimiter },
    async () => buildHealthPayload(),
  );

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
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
      app.log.error({ err: error });
      return {
        success: false,
        error: "Erro na conexão via Prisma",
        details: String(error),
      };
    }
  });

  return app;
}
