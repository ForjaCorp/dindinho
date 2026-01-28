import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

vi.mock("bcryptjs", async () => {
  return {
    hash: vi.fn(async () => "hashed-password"),
  };
});

import { prisma } from "../lib/prisma";
import { main } from "./seed";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("Seed de Usuário Dev", () => {
  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.category.findFirst.mockResolvedValue(null);
    prismaMock.category.create.mockResolvedValue({ id: "cat" } as any);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "dev-user",
      email: "dev@dindinho.com",
    } as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("deve criar usuário dev como ADMIN em ambiente de desenvolvimento", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await main();

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    const callArg = prismaMock.user.create.mock.calls[0][0];
    expect(callArg.data.role).toBe("ADMIN");
  });

  it("não deve criar usuário dev em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await main();

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
