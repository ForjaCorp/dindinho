import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReset, DeepMockProxy } from "vitest-mock-extended";
import { PrismaClient, Role, User } from "@prisma/client";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { buildApp } from "../app";
import { hash } from "bcryptjs";
import { RefreshTokenService } from "./refresh-token.service";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const createMockUser = (overrides?: Partial<User>): User => ({
  id: "uuid-user",
  name: "Integration User",
  email: "int@user.com",
  passwordHash: "hash",
  avatarUrl: null,
  role: Role.VIEWER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

vi.stubEnv("JWT_SECRET", "test-secret");

beforeEach(() => {
  mockReset(prismaMock);
  prismaMock.refreshToken.deleteMany.mockResolvedValue({
    count: 0,
  } as Prisma.BatchPayload);
});

describe("Integração de autenticação (login -> rotação de refresh)", () => {
  it("login retorna refreshToken e rotação gera novo token", async () => {
    const password = "senha-integ";
    const passwordHash = await hash(password, 8);

    // Usuário existe
    prismaMock.user.findUnique.mockResolvedValue(
      createMockUser({ passwordHash }),
    );

    // Espiar métodos do RefreshTokenService (a instância dentro do buildApp usará esses spies)
    const createSpy = vi
      .spyOn(RefreshTokenService.prototype, "createToken")
      .mockResolvedValue("rt-old");
    const validateSpy = vi
      .spyOn(RefreshTokenService.prototype, "validateToken")
      .mockResolvedValue("uuid-user");
    const revokeSpy = vi
      .spyOn(RefreshTokenService.prototype, "revokeToken")
      .mockResolvedValue(true);

    // Quando createToken for chamado para rotação, retornar um novo token
    createSpy.mockResolvedValueOnce("rt-old").mockResolvedValueOnce("rt-new");

    const app = buildApp();

    // Realiza login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: { email: "int@user.com", password },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.body);
    expect(loginBody).toHaveProperty("refreshToken");
    expect(loginBody.refreshToken).toBe("rt-old");

    // Realiza fluxo de refresh
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/refresh",
      payload: { refreshToken: "rt-old" },
    });

    expect(refreshRes.statusCode).toBe(200);
    const refreshBody = JSON.parse(refreshRes.body);
    expect(refreshBody).toHaveProperty("token");
    expect(refreshBody.refreshToken).toBe("rt-new");

    // Verifica que revoke foi chamado para o token antigo
    expect(revokeSpy).toHaveBeenCalledWith("rt-old");

    // Restore spies
    createSpy.mockRestore();
    validateSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});
