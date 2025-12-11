import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { buildApp } from "../app";
import { prisma } from "../lib/prisma";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("Auth Routes", () => {
  // Mockamos o ambiente para ter o JWT_SECRET
  vi.stubEnv("JWT_SECRET", "test-secret");

  const app = buildApp();

  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("deve autenticar usuário com sucesso e retornar token", async () => {
    const password = "senha-secreta";
    const passwordHash = await hash(password, 8); // Gera um hash real para o teste

    prismaMock.user.findUnique.mockResolvedValue({
      id: "uuid-user",
      name: "Usuario Teste",
      email: "teste@auth.com",
      passwordHash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: {
        email: "teste@auth.com",
        password: password,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body).toHaveProperty("token");
    expect(body.user.email).toBe("teste@auth.com");
  });

  it("deve rejeitar login com senha incorreta", async () => {
    const passwordHash = await hash("senha-correta", 8);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "uuid-user",
      name: "Usuario Teste",
      email: "teste@auth.com",
      passwordHash,
    } as any);

    const response = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: {
        email: "teste@auth.com",
        password: "senha-errada",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
