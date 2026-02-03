import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { Waitlist } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

import { waitlistRoutes } from "./waitlist.routes";
import { prisma } from "../lib/prisma";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";

vi.mock("../lib/prisma", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("WaitlistRoutes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    mockReset(prismaMock);
    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.setErrorHandler((error, request, reply) => {
      if (error instanceof ZodError) {
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message: "Os dados fornecidos são inválidos.",
          code: "VALIDATION_ERROR",
          issues: error.issues,
        });
      }

      if (error instanceof Error && "statusCode" in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        return reply.status(statusCode).send({
          statusCode,
          error: "Error",
          message: error.message,
        });
      }

      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro inesperado.",
      });
    });

    await app.register(waitlistRoutes, { prefix: "/" });
    await app.ready();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar 201 ao solicitar convite com sucesso", async () => {
    const payload = {
      name: "Teste",
      email: "teste@exemplo.com",
      phone: "+5511999999999",
    };

    prismaMock.waitlist.findUnique.mockResolvedValue(null);
    prismaMock.waitlist.create.mockResolvedValue({
      id: "123",
      ...payload,
      status: "PENDING",
      createdAt: new Date(),
    } as unknown as Waitlist);

    const response = await app.inject({
      method: "POST",
      url: "/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      message:
        "Solicitação recebida com sucesso! Em breve entraremos em contato.",
    });
  });

  it("deve retornar 409 se o email já estiver na lista", async () => {
    const payload = {
      name: "Teste",
      email: "existente@exemplo.com",
      phone: "+5511999999999",
    };

    prismaMock.waitlist.findUnique.mockResolvedValue({
      id: "1",
    } as unknown as Waitlist);

    const response = await app.inject({
      method: "POST",
      url: "/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: "Conflict",
        message: "Email já está na lista de espera.",
        code: "WAITLIST_EMAIL_ALREADY_EXISTS",
      }),
    );
  });

  it("deve retornar 422 se os dados forem inválidos", async () => {
    const payload = {
      name: "A", // Muito curto
      email: "invalid-email",
      // phone missing
    };

    const response = await app.inject({
      method: "POST",
      url: "/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual(
      expect.objectContaining({
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "Os dados fornecidos são inválidos.",
      }),
    );
  });
});
