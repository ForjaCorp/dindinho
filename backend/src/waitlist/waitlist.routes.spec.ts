import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { waitlistRoutes } from "./waitlist.routes";
import { prisma } from "../lib/prisma";
import {
  ZodTypeProvider,
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

    await app.register(waitlistRoutes);
    await app.ready();

    vi.clearAllMocks();
  });

  it("deve retornar 201 ao solicitar convite com sucesso", async () => {
    const payload = {
      name: "Teste",
      email: "teste@exemplo.com",
      phone: "11999999999",
    };

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.waitlist.create).mockResolvedValue({
      id: "123",
      ...payload,
      status: "PENDING",
      createdAt: new Date(),
    } as any);

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
      phone: "11999999999",
    };

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue({ id: "1" } as any);

    const response = await app.inject({
      method: "POST",
      url: "/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Email já está na lista de espera.",
    });
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
  });
});
