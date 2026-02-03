import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

describe("OpenAPI Documentation", () => {
  it("deve servir Swagger UI em /api/docs", async () => {
    // Garante que o Swagger está habilitado para o teste
    process.env.NODE_ENV = "development";
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/docs",
    });

    expect(response.statusCode).toBe(302);
    const location = response.headers.location;
    if (typeof location !== "string") {
      throw new Error("Header Location ausente na resposta de /api/docs");
    }
    expect(location).toContain("docs/static/index.html");

    const htmlResponse = await app.inject({
      method: "GET",
      url: "/api/docs/static/index.html",
    });

    expect(htmlResponse.statusCode).toBe(200);
    expect(htmlResponse.headers["content-type"]).toContain("text/html");
    expect(htmlResponse.body.toLowerCase()).toContain("swagger");
  });

  it("deve gerar documentação OpenAPI e validar estrutura", async () => {
    process.env.NODE_ENV = "development";
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/docs/json",
    });

    expect(response.statusCode).toBe(200);

    const openapiDoc = JSON.parse(response.body);

    // Verifica estrutura básica
    expect(openapiDoc).toHaveProperty("openapi");
    expect(openapiDoc).toHaveProperty("info");
    expect(openapiDoc).toHaveProperty("paths");
    expect(openapiDoc).toHaveProperty("components");

    // Verifica informações básicas
    expect(openapiDoc.info.title).toBe("Dindinho API");
    expect(openapiDoc.info.version).toBe("1.0.0");

    // Verifica se há paths documentados
    const paths = Object.keys(openapiDoc.paths);
    expect(paths.length).toBeGreaterThan(0);

    // Verifica algumas rotas específicas
    const hasAuthRoutes = paths.some((path: string) => path.includes("/auth/"));
    const hasUserRoutes = paths.some((path: string) => path.includes("/users"));
    const hasTransactionRoutes = paths.some((path: string) =>
      path.includes("/transactions"),
    );

    expect(hasAuthRoutes).toBe(true);
    expect(hasUserRoutes).toBe(true);
    expect(hasTransactionRoutes).toBe(true);

    // Verifica se as tags estão definidas
    expect(openapiDoc).toHaveProperty("tags");
    const tags = openapiDoc.tags.map((tag: { name: string }) => tag.name);

    const expectedTags = [
      "auth",
      "users",
      "accounts",
      "transactions",
      "categories",
      "reports",
      "signup-allowlist",
      "waitlist",
    ];
    for (const tag of expectedTags) {
      expect(tags).toContain(tag);
    }
  });

  it("NÃO deve servir Swagger UI em /api/docs quando em produção", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.ENABLE_SWAGGER = "false";

    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/docs",
    });

    // Quando o Swagger está desabilitado, a rota /api/docs não deve ser registrada
    // O Fastify retornará 404 se o prefixo /api registrar outras rotas, ou a resposta do handler de erro
    expect(response.statusCode).toBe(404);

    process.env.NODE_ENV = originalEnv;
  });

  it("deve servir Swagger UI em /api/docs quando em produção se ENABLE_SWAGGER for true", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalEnable = process.env.ENABLE_SWAGGER;
    process.env.NODE_ENV = "production";
    process.env.ENABLE_SWAGGER = "true";

    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/docs",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("docs/static/index.html");

    process.env.NODE_ENV = originalEnv;
    process.env.ENABLE_SWAGGER = originalEnable;
  });

  it("deve ter summary e tags em todas as operações", async () => {
    process.env.NODE_ENV = "development";
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/docs/json",
    });

    expect(response.statusCode).toBe(200);
    const openapiDoc = JSON.parse(response.body);

    const missingSummary: string[] = [];
    const missingTags: string[] = [];
    const missingErrorResponses: string[] = [];

    // Verifica cada path e método
    for (const [path, methods] of Object.entries(openapiDoc.paths)) {
      for (const [method, operation] of Object.entries(
        methods as Record<string, unknown>,
      )) {
        if (typeof operation === "object" && operation !== null) {
          const op = operation as Record<string, unknown>;

          // Verifica summary
          if (
            !op.summary ||
            typeof op.summary !== "string" ||
            op.summary.length === 0
          ) {
            missingSummary.push(`${method.toUpperCase()} ${path}`);
          }

          // Verifica tags
          if (!op.tags || !Array.isArray(op.tags) || op.tags.length === 0) {
            missingTags.push(`${method.toUpperCase()} ${path}`);
          }

          // Verifica respostas de erro
          const shouldHaveErrorResponses =
            path.startsWith("/api/") &&
            path !== "/api/health" &&
            path !== "/api/test-db";

          if (shouldHaveErrorResponses) {
            if (op.responses && typeof op.responses === "object") {
              const responses = op.responses as Record<string, unknown>;
              const hasErrorResponses = [
                "401",
                "403",
                "404",
                "409",
                "422",
              ].some((code) => responses[code]);
              if (!hasErrorResponses) {
                missingErrorResponses.push(`${method.toUpperCase()} ${path}`);
              }
            } else {
              missingErrorResponses.push(`${method.toUpperCase()} ${path}`);
            }
          }
        }
      }
    }

    expect(missingSummary).toEqual([]);
    expect(missingTags).toEqual([]);
    expect(missingErrorResponses).toEqual([]);
  });
});
