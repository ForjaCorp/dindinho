import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
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

  app.register(authPlugin);

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
    /**
     * @description Configuração de CORS que permite origens específicas baseadas no ambiente.
     * Requisições sem o header 'Origin' (como health checks internos e ferramentas CLI) são permitidas.
     */
    origin: (origin, cb) => {
      // Permitir requisições sem origem (ex: health checks locais, chamadas de servidor)
      if (!origin) {
        cb(null, true);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        const allowedDevOrigins = [
          "http://localhost:4200",
          ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
        ];
        if (allowedDevOrigins.includes(origin)) {
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

  app.register(fastifyRateLimit, {
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

  app.register(healthRoutes);

  app.register(
    async (api: FastifyInstance) => {
      const typedApi = api.withTypeProvider<ZodTypeProvider>();
      typedApi.setValidatorCompiler(validatorCompiler);
      typedApi.setSerializerCompiler(serializerCompiler);

      // Swagger - Documentação da API
      api.register(swagger, {
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

      api.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
          docExpansion: "list",
          deepLinking: false,
        },
      });

      // Rotas
      api.register(healthRoutes);
      api.register(authRoutes, { prefix: "/auth" });
      api.register(usersRoutes, { prefix: "/users" });
      api.register(accountsRoutes, { prefix: "/accounts" });
      api.register(transactionsRoutes, { prefix: "/transactions" });
      api.register(categoriesRoutes, { prefix: "/categories" });
      api.register(reportsRoutes, { prefix: "/reports" });
      api.register(waitlistRoutes, { prefix: "/waitlist" });
      api.register(signupAllowlistRoutes, { prefix: "/signup-allowlist" });
    },
    { prefix: "/api" },
  );

  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const { validation, code, message, statusCode = 500 } = error;
      const { id: requestId } = request;

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

      if (isRecord(error) && "statusCode" in error) {
        const customStatusCode = error.statusCode as number;
        const customMessage =
          "message" in error && typeof error.message === "string"
            ? error.message
            : message;
        const customCode = normalizeErrorCode(
          "code" in error ? error.code : undefined,
        );

        return reply.status(customStatusCode).send(
          buildApiErrorResponse({
            statusCode: customStatusCode,
            message: customMessage,
            requestId,
            code: customCode,
            details: "details" in error ? error.details : undefined,
          }),
        );
      }

      request.log.error(error, "Internal Server Error");

      return reply.status(statusCode).send(
        buildApiErrorResponse({
          statusCode,
          message: "Ocorreu um erro inesperado.",
          requestId,
          code: normalizeErrorCode(code),
        }),
      );
    },
  );

  const refreshTokenService = new RefreshTokenService(prisma, app.log);
  if (
    String(process.env.ENABLE_REFRESH_CLEANUP).toLowerCase() === "true" &&
    process.env.NODE_ENV !== "test"
  ) {
    // TODO: Implementar agendamento de limpeza de tokens (ex: node-cron)
    refreshTokenService.cleanupExpiredTokens();
  }

  return app;
}
