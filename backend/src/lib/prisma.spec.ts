import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const prismaMariaDbMock = vi.fn();
const prismaClientMock = vi.fn();

vi.mock("@prisma/adapter-mariadb", () => ({
  PrismaMariaDb: prismaMariaDbMock,
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: prismaClientMock,
}));

const setBaseEnv = () => {
  process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/dindinho";
};

describe("Configuração do Prisma", () => {
  beforeEach(() => {
    prismaMariaDbMock.mockClear();
    prismaClientMock.mockClear();
    vi.resetModules();
    setBaseEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_SSL;
    delete process.env.NODE_ENV;
  });

  it("deve desativar SSL quando DATABASE_SSL não é true", async () => {
    process.env.NODE_ENV = "production";

    await import("./prisma.js");

    const config = prismaMariaDbMock.mock.calls[0]?.[0];
    expect(config.ssl).toBe(false);
    expect(config.allowPublicKeyRetrieval).toBe(false);
  });

  it("deve ativar SSL quando DATABASE_SSL é true", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_SSL = "true";

    await import("./prisma.js");

    const config = prismaMariaDbMock.mock.calls[0]?.[0];
    expect(config.ssl).toBe(true);
    expect(config.allowPublicKeyRetrieval).toBe(false);
  });
});
