import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";
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
  prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 0 } as any);
});

describe("Serviço de RefreshToken", () => {
  it("createToken armazena hash do token e retorna token raw com TTL padrão", async () => {
    const service = new RefreshTokenService(prismaMock, console as any, 7);

    let captured: any = null;
    (prismaMock.refreshToken.create as any).mockImplementation(
      async (args: any) => {
        captured = args;
        return {
          id: "rt1",
          token: args.data.token,
          userId: args.data.userId,
          expiresAt: args.data.expiresAt,
          createdAt: new Date(),
          // Prisma client result may include relation helpers; cast to any for test
          user: { id: args.data.userId, email: "test@x.com" },
        } as any;
      },
    );

    const raw = await service.createToken("user-123");
    expect(typeof raw).toBe("string");

    const hashedHex = createHash("sha256").update(raw).digest("hex");
    expect(captured).toBeTruthy();
    // captured.data.token is stored as Buffer (binário). Compare em hex.
    expect((captured.data.token as Buffer).toString("hex")).toBe(hashedHex);
    expect(captured.data.userId).toBe("user-123");

    const diffDays =
      (captured.data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
  });

  it("validateToken retorna userId para token válido e remove token expirado", async () => {
    const service = new RefreshTokenService(prismaMock, console as any, 7);

    const raw = "my-raw-token";
    const hashed = createHash("sha256").update(raw).digest("hex");

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-valid",
      token: hashed,
      userId: "user-x",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      createdAt: new Date(),
    } as any);

    const uid = await service.validateToken(raw);
    expect(uid).toBe("user-x");

    // expired case
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-expired",
      token: hashed,
      userId: "user-x",
      expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      createdAt: new Date(),
    } as any);

    prismaMock.refreshToken.delete.mockResolvedValue({} as any);
    const uid2 = await service.validateToken(raw);
    expect(uid2).toBeNull();
    expect(prismaMock.refreshToken.delete).toHaveBeenCalled();
  });

  it("revokeToken remove token hash e retorna booleano", async () => {
    const service = new RefreshTokenService(prismaMock, console as any, 7);
    const raw = "some-token";
    const expectedHex = createHash("sha256").update(raw).digest("hex");

    prismaMock.refreshToken.delete.mockResolvedValue({} as any);
    const ok = await service.revokeToken(raw);
    expect(ok).toBe(true);
    expect(prismaMock.refreshToken.delete).toHaveBeenCalled();
    const callArg = prismaMock.refreshToken.delete.mock.calls[0][0] as any;
    // o token é passado como Buffer; compare em hex
    expect(Buffer.from(callArg.where.token).toString("hex")).toBe(expectedHex);

    prismaMock.refreshToken.delete.mockRejectedValue(new Error("fail"));
    const ok2 = await service.revokeToken(raw);
    expect(ok2).toBe(false);
  });
});
