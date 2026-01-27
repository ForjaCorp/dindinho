import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import fastifyRateLimit from "@fastify/rate-limit";

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
    keyGenerator: (request) =>
      (request.headers["x-real-ip"] as string | undefined) || request.ip,
  });
  app.addHook("onRequest", async (request, reply) => {
    const adminKey = process.env.ALLOWLIST_ADMIN_KEY;

    if (!adminKey) {
      return reply.status(503).send({ message: "Chave admin não configurada" });
    }

    const providedKey = request.headers["x-admin-key"];
    const normalizedKey = Array.isArray(providedKey)
      ? providedKey[0]
      : providedKey;
    if (!normalizedKey || normalizedKey !== adminKey) {
      return reply.status(401).send({ message: "Chave admin inválida" });
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
          401: z.object({ message: z.string() }),
          503: z.object({ message: z.string() }),
        },
      },
    },
    async () => {
      const items = await prisma.signupAllowlist.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, createdAt: true },
      });

      return items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));
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
          401: z.object({ message: z.string() }),
          503: z.object({ message: z.string() }),
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
          401: z.object({ message: z.string() }),
          503: z.object({ message: z.string() }),
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
