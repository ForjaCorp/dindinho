import { FastifyInstance, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import fastifyRateLimit from "@fastify/rate-limit";
import { apiErrorResponseSchema } from "@dindinho/shared";

const emailSchema = z.string().email();

const allowlistItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export async function signupAllowlistRoutes(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    global: true,
    hook: "onRequest",
    max: Number(process.env.ALLOWLIST_RATE_LIMIT_MAX ?? "30"),
    timeWindow: /^[0-9]+$/.test(
      process.env.ALLOWLIST_RATE_LIMIT_TIME_WINDOW || "",
    )
      ? Number(process.env.ALLOWLIST_RATE_LIMIT_TIME_WINDOW)
      : (process.env.ALLOWLIST_RATE_LIMIT_TIME_WINDOW ?? "1 minute"),
    keyGenerator: (request: FastifyRequest) =>
      (request.headers["x-real-ip"] as string | undefined) || request.ip,
  });
  app.addHook("onRequest", async (request) => {
    const adminKey = process.env.ALLOWLIST_ADMIN_KEY;
    const providedKey = request.headers["x-admin-key"];
    const normalizedKey = Array.isArray(providedKey)
      ? providedKey[0]
      : providedKey;

    if (normalizedKey && !adminKey) {
      throw {
        statusCode: 503,
        message: "Chave admin não configurada",
        code: "ADMIN_KEY_NOT_CONFIGURED",
      };
    }

    if (adminKey && normalizedKey === adminKey) {
      return;
    }

    try {
      await request.jwtVerify();
    } catch {
      if (normalizedKey) {
        throw {
          statusCode: 401,
          message: "Chave admin inválida",
          code: "INVALID_ADMIN_KEY",
        };
      }
      throw {
        statusCode: 401,
        message: "Token inválido ou expirado",
        code: "INVALID_TOKEN",
      };
    }

    const userId = (request.user as { sub: string }).sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      throw {
        statusCode: 403,
        message: "Acesso restrito a administradores",
        code: "FORBIDDEN",
      };
    }
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    "/allowlist",
    {
      schema: {
        summary: "Listar emails liberados",
        tags: ["allowlist"],
        response: {
          200: z.array(allowlistItemSchema),
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          503: apiErrorResponseSchema,
        },
      },
    },
    async () => {
      const items = await prisma.signupAllowlist.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, createdAt: true },
      });

      return items.map(
        (item: { id: string; email: string; createdAt: Date }) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        }),
      );
    },
  );

  app.withTypeProvider<ZodTypeProvider>().post(
    "/allowlist",
    {
      schema: {
        summary: "Adicionar email na allowlist",
        tags: ["allowlist"],
        body: z.object({ email: emailSchema }),
        response: {
          201: allowlistItemSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          503: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const payload = request.body as { email: string };
      const email = payload.email.trim().toLowerCase();

      const item = await prisma.signupAllowlist.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true, email: true, createdAt: true },
      });

      return reply.status(201).send({
        ...item,
        createdAt: item.createdAt.toISOString(),
      });
    },
  );

  app.withTypeProvider<ZodTypeProvider>().delete(
    "/allowlist/:email",
    {
      schema: {
        summary: "Remover email da allowlist",
        tags: ["allowlist"],
        params: z.object({ email: emailSchema }),
        response: {
          200: z.object({ deleted: z.boolean() }),
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          503: apiErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const email = emailSchema
        .parse(request.params.email)
        .trim()
        .toLowerCase();

      const result = await prisma.signupAllowlist.deleteMany({
        where: { email },
      });

      return { deleted: result.count > 0 };
    },
  );
}
