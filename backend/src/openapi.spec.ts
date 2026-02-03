import { describe, it, expect } from "vitest";
import { buildApp } from "./app";

describe("OpenAPI Documentation", () => {
  it("deve servir Swagger UI em /api/docs", async () => {
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

    // Verifica segurança global
    expect(openapiDoc.components.securitySchemes).toHaveProperty("bearerAuth");
    expect(openapiDoc.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(openapiDoc.components.securitySchemes.bearerAuth.scheme).toBe(
      "bearer",
    );
  });

  it("deve ter summary e tags em todas as operações", async () => {
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
