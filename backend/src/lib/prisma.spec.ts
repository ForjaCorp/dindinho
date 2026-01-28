import { describe, it, expect, vi, beforeEach } from "vitest";

const buildUrl = () => new URL("mysql://user:pass@localhost:3306/dindinho");

describe("Config Prisma MariaDB", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("deve habilitar allowPublicKeyRetrieval quando SSL está desativado", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@localhost:3306/dindinho");
    vi.stubEnv("DATABASE_SSL", "false");
    vi.stubEnv("NODE_ENV", "production");

    const { buildMariaDbAdapterConfig } = await import("./prisma.js");
    const config = buildMariaDbAdapterConfig(buildUrl());

    expect(config.ssl).toBe(false);
    expect(config.allowPublicKeyRetrieval).toBe(true);
  });

  it("deve desabilitar allowPublicKeyRetrieval quando SSL está ativo", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@localhost:3306/dindinho");
    vi.stubEnv("DATABASE_SSL", "true");
    vi.stubEnv("NODE_ENV", "production");

    const { buildMariaDbAdapterConfig } = await import("./prisma.js");
    const config = buildMariaDbAdapterConfig(buildUrl());

    expect(config.ssl).toBe(true);
    expect(config.allowPublicKeyRetrieval).toBe(false);
  });
});
