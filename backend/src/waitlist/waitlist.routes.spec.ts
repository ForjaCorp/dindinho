import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { waitlistRoutes } from "./waitlist.routes";
import { prisma } from "../lib/prisma";
import { Waitlist } from "@prisma/client";
import { ZodError } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

// Mock do prisma
vi.mock("../lib/prisma", () => ({
  prisma: {
    waitlist: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("WaitlistRoutes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();

    // Configuração necessária para Zod provider
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.setErrorHandler((error: unknown, request, reply) => {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Dados inválidos",
          code: "VALIDATION_ERROR",
          requestId: request.id,
          issues: error.issues,
        });
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error
      ) {
        const e = error as {
          statusCode: number;
          message?: string;
          code?: string;
          validation?: unknown;
        };
        const statusCode =
          typeof e.statusCode === "number" && Number.isFinite(e.statusCode)
            ? e.statusCode
            : 500;

        const isValidationError =
          statusCode === 400 && e.code === "FST_ERR_VALIDATION";
        const errorLabel =
          statusCode === 409
            ? "Conflict"
            : statusCode === 400
              ? "Bad Request"
              : "Error";
        return reply.status(statusCode).send({
          statusCode,
          error: errorLabel,
          message: isValidationError
            ? "Dados inválidos"
            : (e.message ?? "Erro inesperado"),
          code: isValidationError ? "VALIDATION_ERROR" : e.code,
          requestId: request.id,
          details: isValidationError ? e.validation : undefined,
        });
      }

      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Erro interno do servidor",
        requestId: request.id,
      });
    });

    await app.register(waitlistRoutes);
    await app.ready();

    vi.clearAllMocks();
  });

  it("deve retornar 201 ao solicitar convite com sucesso", async () => {
    const payload = {
      name: "Teste",
      email: "teste@exemplo.com",
      phone: "+5511999999999",
    };

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.waitlist.create).mockResolvedValue({
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

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue({
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
      }),
    );
  });

  it("deve retornar 400 se os dados forem inválidos", async () => {
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

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        statusCode: 400,
        error: "Bad Request",
        message: "Dados inválidos",
      }),
    );
  });
});
