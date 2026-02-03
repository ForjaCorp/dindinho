import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { prisma } from "../lib/prisma";
import { getHttpErrorLabel } from "../lib/get-http-error-label";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authenticateAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const authPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      const statusCode = 401;
      reply.code(statusCode).send({
        statusCode,
        error: getHttpErrorLabel(statusCode),
        message: "Token de autenticação inválido ou expirado.",
        code: "INVALID_TOKEN",
      });
    }
  };

  const authenticateAdmin = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      await request.jwtVerify();
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        const statusCode = 403;
        reply.code(statusCode).send({
          statusCode,
          error: getHttpErrorLabel(statusCode),
          message: "Acesso restrito a administradores.",
          code: "FORBIDDEN",
        });
      }
    } catch {
      const statusCode = 401;
      reply.code(statusCode).send({
        statusCode,
        error: getHttpErrorLabel(statusCode),
        message: "Token de autenticação inválido ou expirado.",
        code: "INVALID_TOKEN",
      });
    }
  };

  app.decorate("authenticate", authenticate);
  app.decorate("authenticateAdmin", authenticateAdmin);
});

export default authPlugin;
