import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import {
  PrismaClient,
  Role,
  SignupAllowlist,
  User,
  Prisma,
} from "@prisma/client";

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

describe("Rotas de allowlist de cadastro", () => {
  let app: ReturnType<typeof buildApp>;
  let token: string;
  const userId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(async () => {
    mockReset(prismaMock);
    vi.stubEnv("ALLOWLIST_ADMIN_KEY", "admin-key");
    vi.stubEnv("JWT_SECRET", "test-secret");
    app = buildApp();
    await app.ready();
    token = app.jwt.sign({ sub: userId });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it("deve negar acesso sem credenciais", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/allowlist",
    });

    expect(response.statusCode).toBe(401);
  });

  it("deve adicionar email na allowlist com x-admin-key", async () => {
    prismaMock.signupAllowlist.upsert.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as SignupAllowlist);

    const response = await app.inject({
      method: "POST",
      url: "/api/allowlist",
      headers: {
        "x-admin-key": "admin-key",
      },
      payload: {
        email: "USER@EXAMPLE.COM",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("deve adicionar email na allowlist com JWT admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: Role.ADMIN,
    } as unknown as User);
    prismaMock.signupAllowlist.upsert.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174001",
      email: "admin@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as SignupAllowlist);

    const response = await app.inject({
      method: "POST",
      url: "/api/allowlist",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        email: "admin@example.com",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      id: "123e4567-e89b-12d3-a456-426614174001",
      email: "admin@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("deve negar acesso com JWT sem role admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: Role.VIEWER,
    } as unknown as User);

    const response = await app.inject({
      method: "GET",
      url: "/api/allowlist",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it("deve remover email da allowlist", async () => {
    prismaMock.signupAllowlist.deleteMany.mockResolvedValue({
      count: 1,
    } as unknown as Prisma.BatchPayload);

    const response = await app.inject({
      method: "DELETE",
      url: "/api/allowlist/user@example.com",
      headers: {
        "x-admin-key": "admin-key",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ deleted: true });
  });
});
