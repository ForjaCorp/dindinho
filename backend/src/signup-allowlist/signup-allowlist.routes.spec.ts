import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

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

  beforeEach(async () => {
    mockReset(prismaMock);
    vi.stubEnv("ALLOWLIST_ADMIN_KEY", "admin-key");
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it("deve negar acesso sem x-admin-key", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/allowlist",
    });

    expect(response.statusCode).toBe(401);
  });

  it("deve adicionar email na allowlist", async () => {
    prismaMock.signupAllowlist.upsert.mockResolvedValue({
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as any);

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

  it("deve remover email da allowlist", async () => {
    prismaMock.signupAllowlist.deleteMany.mockResolvedValue({
      count: 1,
    } as any);

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
