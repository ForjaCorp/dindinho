import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, RefreshToken, Prisma } from "@prisma/client";
import { createHash } from "crypto";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { prisma } from "../lib/prisma";
import { RefreshTokenService } from "./refresh-token.service";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
  prismaMock.refreshToken.deleteMany.mockResolvedValue({
    count: 0,
  } as Prisma.BatchPayload);
});

describe("Serviço de RefreshToken", () => {
  it("createToken armazena hash do token e retorna token raw com TTL padrão", async () => {
    const service = new RefreshTokenService(prismaMock, console, 7);

    // Prepare a resolved value for create and capture the call args afterwards
    prismaMock.refreshToken.create.mockResolvedValue({
      id: "rt1",
      token: Buffer.alloc(32),
      userId: "user-123",
      expiresAt: new Date(),
      createdAt: new Date(),
    } as unknown as RefreshToken);

    const raw = await service.createToken("user-123");
    expect(typeof raw).toBe("string");

    const hashedHex = createHash("sha256").update(raw).digest("hex");
    const captured = prismaMock.refreshToken.create.mock.calls[0][0];
    expect(captured).toBeTruthy();
    // captured.data.token is armazenado como Buffer. Compare em hex.
    expect((captured.data.token as Buffer).toString("hex")).toBe(hashedHex);
    expect(captured.data.userId).toBe("user-123");

    const diffDays =
      ((captured.data.expiresAt as Date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
  });

  it("validateToken retorna userId para token válido e remove token expirado", async () => {
    const service = new RefreshTokenService(prismaMock, console, 7);

    const raw = "my-raw-token";
    const hashed = createHash("sha256").update(raw).digest("hex");

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-valid",
      token: Buffer.from(hashed, "hex"),
      userId: "user-x",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      createdAt: new Date(),
    } as unknown as RefreshToken);

    const uid = await service.validateToken(raw);
    expect(uid).toBe("user-x");

    // expired case
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-expired",
      token: Buffer.from(hashed, "hex"),
      userId: "user-x",
      expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      createdAt: new Date(),
    } as unknown as RefreshToken);

    prismaMock.refreshToken.delete.mockResolvedValue({
      id: "rt-expired",
      token: Buffer.from(hashed, "hex"),
      userId: "user-x",
      expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      createdAt: new Date(),
    } as unknown as RefreshToken);
    const uid2 = await service.validateToken(raw);
    expect(uid2).toBeNull();
    expect(prismaMock.refreshToken.delete).toHaveBeenCalled();
  });

  it("revokeToken remove token hash e retorna booleano", async () => {
    const service = new RefreshTokenService(prismaMock, console, 7);
    const raw = "some-token";
    const expectedHex = createHash("sha256").update(raw).digest("hex");

    prismaMock.refreshToken.delete.mockResolvedValue({
      id: "rt-del",
      token: Buffer.from(expectedHex, "hex"),
      userId: "user-x",
      expiresAt: new Date(),
      createdAt: new Date(),
    } as unknown as RefreshToken);
    const ok = await service.revokeToken(raw);
    expect(ok).toBe(true);
    expect(prismaMock.refreshToken.delete).toHaveBeenCalled();
    const callArg = prismaMock.refreshToken.delete.mock
      .calls[0][0] as unknown as {
      where: { token: Uint8Array };
    };
    // o token é passado como Buffer; compare em hex
    expect(Buffer.from(callArg.where.token).toString("hex")).toBe(expectedHex);

    prismaMock.refreshToken.delete.mockRejectedValue(new Error("fail"));
    const ok2 = await service.revokeToken(raw);
    expect(ok2).toBe(false);
  });
});
