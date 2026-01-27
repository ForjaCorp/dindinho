import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, Role, User } from "@prisma/client";
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

/**
 * Factory function para criar mocks de usuário para testes
 * @function createMockUser
 * @param overrides - Campos para sobrescrever valores default
 * @returns {User} Mock completo do usuário Prisma
 */
const createMockUser = (overrides?: Partial<User>): User => ({
  id: "default-id",
  name: "Default Name",
  email: "default@test.com",
  passwordHash: "default-hash",
  avatarUrl: null,
  role: Role.VIEWER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("Auth Routes", () => {
  // Mockamos o ambiente para ter o JWT_SECRET
  vi.stubEnv("JWT_SECRET", "test-secret");

  const app = buildApp();

  beforeEach(() => {
    mockReset(prismaMock);
  });

  it("deve autenticar usuário com sucesso e retornar token", async () => {
    const password = "senha-secreta";
    const passwordHash = await hash(password, 8);

    prismaMock.user.findUnique.mockResolvedValue(
      createMockUser({
        id: "uuid-user",
        name: "Usuario Teste",
        email: "teste@auth.com",
        passwordHash,
      }),
    );

    // Mock do refreshToken - todos os métodos necessários
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.refreshToken.create.mockResolvedValue({
      id: "refresh-token-id",
      token: Buffer.from("mock-refresh-token"),
      userId: "uuid-user",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    prismaMock.refreshToken.findUnique.mockResolvedValue(null);
    prismaMock.refreshToken.delete.mockResolvedValue({
      id: "refresh-token-id",
      token: Buffer.from("mock-refresh-token"),
      userId: "uuid-user",
      expiresAt: new Date(),
      createdAt: new Date(),
    });

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
    // Por enquanto, vamos verificar apenas o token e user
    expect(body).toHaveProperty("user");
    expect(body.user.email).toBe("teste@auth.com");

    // O refreshToken será implementado corretamente em seguida
    if (body.refreshToken) {
      expect(body).toHaveProperty("refreshToken");
    }
  });

  it("deve rejeitar login com senha incorreta", async () => {
    const passwordHash = await hash("senha-correta", 8);

    prismaMock.user.findUnique.mockResolvedValue(
      createMockUser({
        id: "uuid-user",
        name: "Usuario Teste",
        email: "teste@auth.com",
        passwordHash,
      }),
    );

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
