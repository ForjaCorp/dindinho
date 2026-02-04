import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildApp } from "./app";

describe("Rate Limit", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("TRUST_PROXY", "true");
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it("deve limitar requisições por IP", async () => {
    vi.stubEnv("RATE_LIMIT_MAX", "2");
    vi.stubEnv("RATE_LIMIT_TIME_WINDOW", "1000");

    // Rebuild app to apply env changes
    await app.close();
    app = buildApp();
    await app.ready();

    const r1 = await app.inject({ method: "GET", url: "/api/health" });
    const r2 = await app.inject({ method: "GET", url: "/api/health" });
    const r3 = await app.inject({ method: "GET", url: "/api/health" });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);
    const payload = r3.json();
    expect(payload.statusCode).toBe(429);
  });

  it("deve respeitar allowlist via X-Real-IP", async () => {
    vi.stubEnv("RATE_LIMIT_MAX", "1");
    vi.stubEnv("RATE_LIMIT_TIME_WINDOW", "1000");
    vi.stubEnv("RATE_LIMIT_ALLOWLIST", "8.8.8.8");

    await app.close();
    app = buildApp();
    await app.ready();

    const headers = { "x-real-ip": "8.8.8.8" } as Record<string, string>;
    const r1 = await app.inject({ method: "GET", url: "/api/health", headers });
    const r2 = await app.inject({ method: "GET", url: "/api/health", headers });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
  });
});
