import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import authPlugin from "./plugins/auth";
import { healthRoutes } from "./plugins/health";

import { usersRoutes } from "./users/users.routes";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authRoutes } from "./auth/auth.routes";
import { accountsRoutes } from "./accounts/accounts.routes";
import { transactionsRoutes } from "./transactions/transactions.routes";
import { categoriesRoutes } from "./categories/categories.routes";
import { signupAllowlistRoutes } from "./signup-allowlist/signup-allowlist.routes";
import { waitlistRoutes } from "./waitlist/waitlist.routes";
import { reportsRoutes } from "./reports/reports.routes";
import { RefreshTokenService } from "./auth/refresh-token.service";
import { ApiErrorResponseDTO } from "@dindinho/shared";
import { prisma } from "./lib/prisma";
import { getHttpErrorLabel } from "./lib/get-http-error-label";
import { AppError } from "./lib/errors";

const ERROR_CODE_RE = /^[A-Z0-9_]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeErrorCode = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;
  if (!ERROR_CODE_RE.test(value)) return undefined;
  return value;
};

const buildApiErrorResponse = (params: {
  statusCode: number;
  message: string;
  requestId: string;
  code?: string;
  issues?: unknown;
  details?: unknown;
}): ApiErrorResponseDTO => {
  const { statusCode, message, requestId, code, issues, details } = params;
  return {
    statusCode,
    error: getHttpErrorLabel(statusCode),
    message,
    code,
    requestId,
    issues: Array.isArray(issues) ? issues : undefined,
    details,
  };
};
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
        "req.body.password",
        "req.body.newPassword",
      ],
    },
    trustProxy: process.env.TRUST_PROXY === "true",
  });

  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "fallback-secret-for-dev",
    sign: { expiresIn: "15m" },
  });

  // Swagger - Documentação da API (Global para capturar todas as rotas)
  app.register(swagger, {
    openapi: {
      info: {
        title: "Dindinho API",
        description: "API para o app de finanças pessoais Dindinho.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "auth", description: "Autenticação de usuários" },
        { name: "users", description: "Gestão de usuários" },
        { name: "accounts", description: "Contas bancárias" },
        { name: "transactions", description: "Transações financeiras" },
        { name: "categories", description: "Categorias de transações" },
        { name: "reports", description: "Relatórios financeiros" },
        {
          name: "signup-allowlist",
          description: "Lista de permissão de cadastro",
        },
        { name: "waitlist", description: "Lista de espera" },
        { name: "health", description: "Saúde da aplicação" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.register(authPlugin);

  app.register(healthRoutes);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(underPressure, {
    maxEventLoopDelay: 5000,
    maxHeapUsedBytes: 500000000,
    maxRssBytes: 500000000,
    maxEventLoopUtilization: 0.95,
    pressureHandler: (_req, rep, _type, _value) => {
      rep.code(503).send({ message: "Serviço indisponível" });
    },
  });

  app.register(cors, {
    origin: (origin, cb) => {
      // Permitir requisições sem origem (ex: health checks locais, chamadas de servidor)
      if (!origin) {
        cb(null, true);
        return;
      }

      // Em desenvolvimento, permitir qualquer localhost para evitar problemas de porta (4200, 4201, etc)
      if (process.env.NODE_ENV !== "production") {
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          cb(null, true);
          return;
        }
      }

      const allowedOrigins = (process.env.FRONTEND_URL || "").split(",");
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  });

  app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || "1 minute",
    allowList: process.env.RATE_LIMIT_ALLOWLIST
      ? process.env.RATE_LIMIT_ALLOWLIST.split(",")
      : undefined,
    keyGenerator: (request) => {
      const xRealIp = request.headers["x-real-ip"];
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp || request.ip;
    },
  });

  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const { validation, code, message, statusCode = 500 } = error;
      const { id: requestId } = request;
      const isDev = process.env.NODE_ENV !== "production";

      // Log detalhado do erro no servidor
      request.log.error(
        {
          err: error,
          requestId,
          url: request.url,
          method: request.method,
        },
        "Erro capturado pelo ErrorHandler",
      );

      // Erros de validação do Zod
      if (error instanceof ZodError) {
        return reply.status(422).send(
          buildApiErrorResponse({
            statusCode: 422,
            message: "Os dados fornecidos são inválidos.",
            requestId,
            code: "VALIDATION_ERROR",
            issues: validation,
          }),
        );
      }

      // Erros de Domínio (AppError)
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(
          buildApiErrorResponse({
            statusCode: error.statusCode,
            message: error.message,
            requestId,
            code: error.code,
            details: error.details,
          }),
        );
      }

      // Erros conhecidos do Fastify ou erros com statusCode explícito
      if (isRecord(error) && "statusCode" in error) {
        const customStatusCode = error.statusCode as number;
        const customMessage =
          "message" in error && typeof error.message === "string"
            ? error.message
            : message;
        const customCode = normalizeErrorCode(
          "code" in error ? error.code : undefined,
        );

        // Sanitização de detalhes para produção em erros 5xx
        const details =
          customStatusCode >= 500 && !isDev
            ? undefined
            : "details" in error
              ? error.details
              : undefined;

        return reply.status(customStatusCode).send(
          buildApiErrorResponse({
            statusCode: customStatusCode,
            message: customMessage,
            requestId,
            code: customCode,
            details,
          }),
        );
      }

      // Erros genéricos 500 ou não mapeados
      return reply.status(statusCode).send(
        buildApiErrorResponse({
          statusCode,
          message: isDev ? message : "Ocorreu um erro interno no servidor.",
          requestId,
          code: normalizeErrorCode(code),
        }),
      );
    },
  );

  // API v1
  app.register(
    async (api: FastifyInstance) => {
      const typedApi = api.withTypeProvider<ZodTypeProvider>();

      // Swagger UI - Documentação da API (Somente em desenvolvimento ou se explicitamente habilitado)
      if (
        process.env.NODE_ENV !== "production" ||
        process.env.ENABLE_SWAGGER === "true"
      ) {
        typedApi.register(swaggerUi, {
          routePrefix: "/docs",
          uiConfig: {
            docExpansion: "list",
            deepLinking: false,
          },
        });
      }

      // Registro de rotas sequencial para garantir ordem de inicialização
      typedApi.log.debug("Iniciando registro de rotas da API...");

      await typedApi.register(healthRoutes);
      await typedApi.register(authRoutes, { prefix: "/auth" });
      await typedApi.register(usersRoutes, { prefix: "/users" });
      await typedApi.register(accountsRoutes, { prefix: "/accounts" });
      await typedApi.register(transactionsRoutes, { prefix: "/transactions" });
      await typedApi.register(categoriesRoutes, { prefix: "/categories" });
      await typedApi.register(reportsRoutes, { prefix: "/reports" });
      await typedApi.register(waitlistRoutes, { prefix: "/waitlist" });
      await typedApi.register(signupAllowlistRoutes, {
        prefix: "/signup-allowlist",
      });

      typedApi.log.debug("Registro de rotas da API concluído.");
    },
    { prefix: "/api" },
  );

  const refreshTokenService = new RefreshTokenService(prisma, app.log);
  if (
    String(process.env.ENABLE_REFRESH_CLEANUP).toLowerCase() === "true" &&
    process.env.NODE_ENV !== "test"
  ) {
    const intervalMinutes =
      Number(process.env.REFRESH_CLEANUP_INTERVAL_MINUTES) || 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    app.log.info(
      { intervalMinutes },
      "Agendando limpeza automática de refresh tokens",
    );

    const cleanupInterval = setInterval(async () => {
      try {
        const count = await refreshTokenService.cleanupExpiredTokens();
        if (count > 0) {
          app.log.info(
            { count },
            "Limpeza automática de refresh tokens concluída",
          );
        }
      } catch (err) {
        app.log.error({ err }, "Erro na limpeza automática de refresh tokens");
      }
    }, intervalMs);

    cleanupInterval.unref();

    app.addHook("onClose", async () => {
      clearInterval(cleanupInterval);
    });

    // Executa uma vez na inicialização (após o servidor estar pronto)
    app.ready().then(() => {
      refreshTokenService.cleanupExpiredTokens().catch((err) => {
        app.log.error({ err }, "Erro na limpeza inicial de refresh tokens");
      });
    });
  }

  return app;
}
