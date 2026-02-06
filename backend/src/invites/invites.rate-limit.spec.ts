import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock do Prisma usando vi.hoisted para evitar problemas de hoisting
const { mockInviteFindUnique, mockUserFindUnique } = vi.hoisted(() => ({
  mockInviteFindUnique: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    invite: {
      findUnique: mockInviteFindUnique,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

import { buildApp } from "../app";

describe("Invites Rate Limit", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    vi.stubEnv("ENABLE_RATE_LIMIT_IN_TESTS", "true");
    vi.stubEnv("INVITE_RATE_LIMIT_MAX", "2");
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");

    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it("deve limitar acessos à rota pública de convite", async () => {
    const token = "some-token";
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    mockInviteFindUnique.mockResolvedValue({
      id: validUuid,
      token,
      email: "test@example.com",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      sender: { id: validUuid, name: "Sender" },
      accounts: [],
    });

    const url = `/api/invites/t/${token}`;

    const r1 = await app.inject({ method: "GET", url });
    const r2 = await app.inject({ method: "GET", url });
    const r3 = await app.inject({ method: "GET", url });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);

    const payload = r3.json();
    expect(payload.code).toBe("TOO_MANY_REQUESTS");
    expect(payload.message).toContain(
      "Muitas tentativas de acesso aos convites",
    );
  });

  it("deve diferenciar limites por IP (X-Real-IP)", async () => {
    const token = "some-token";
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    mockInviteFindUnique.mockResolvedValue({
      id: validUuid,
      token,
      email: "test@example.com",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      sender: { id: validUuid, name: "Sender" },
      accounts: [],
    });

    const url = `/api/invites/t/${token}`;

    // IP 1: Faz 2 requisições (OK)
    await app.inject({
      method: "GET",
      url,
      headers: { "x-real-ip": "1.1.1.1" },
    });
    await app.inject({
      method: "GET",
      url,
      headers: { "x-real-ip": "1.1.1.1" },
    });

    // IP 2: Faz 1 requisição (OK, não deve ser afetado pelo IP 1)
    const rIP2 = await app.inject({
      method: "GET",
      url,
      headers: { "x-real-ip": "2.2.2.2" },
    });
    expect(rIP2.statusCode).toBe(200);

    // IP 1: Tenta a terceira (BLOQUEADO)
    const rIP1_3 = await app.inject({
      method: "GET",
      url,
      headers: { "x-real-ip": "1.1.1.1" },
    });
    expect(rIP1_3.statusCode).toBe(429);
  });
});
