/**
 * @file Testes de integração para os endpoints de health do servidor
 * @description Testes para endpoints de verificação de saúde e conexão com banco
 * @module server.spec
 * @requires vitest
 * @requires vitest-mock-extended
 * @requires @prisma/client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

vi.mock("./lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { buildApp } from "./app";
import { prisma } from "./lib/prisma";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

/**
 * Conjunto de testes para endpoints de health do servidor
 * @group integration/server
 */
describe("Server Health Endpoints", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    mockReset(prismaMock);
    app = buildApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Testa o endpoint de health check
   * @test {GET /health} Deve retornar status ok e informações da aplicação
   */
  it("deve retornar status ok no endpoint health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body).toMatchObject({
      status: "ok",
      app: "Dindinho API",
    });
    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe("string");

    // Verifica se o timestamp está no formato ISO
    const timestamp = new Date(body.timestamp);
    expect(timestamp.toISOString()).toBe(body.timestamp);
  });

  /**
   * Testa o endpoint de teste de banco com sucesso
   * @test {GET /test-db} Deve retornar sucesso e contagem de usuários
   */
  it("deve retornar sucesso no teste de conexão com banco", async () => {
    prismaMock.user.count.mockResolvedValue(5);

    const response = await app.inject({
      method: "GET",
      url: "/test-db",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body).toMatchObject({
      success: true,
      message: "Prisma conectado com sucesso!",
      usersCount: 5,
    });
    expect(prismaMock.user.count).toHaveBeenCalled();
  });

  /**
   * Testa o endpoint de teste de banco com erro
   * @test {GET /test-db} Deve retornar erro quando falha conexão
   */
  it("deve retornar erro quando falha conexão com banco", async () => {
    const dbError = new Error("Connection timeout");
    prismaMock.user.count.mockRejectedValue(dbError);

    const response = await app.inject({
      method: "GET",
      url: "/test-db",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body).toMatchObject({
      success: false,
      error: "Erro na conexão via Prisma",
      details: "Error: Connection timeout",
    });
    expect(prismaMock.user.count).toHaveBeenCalled();
  });

  /**
   * Testa se o endpoint health funciona independentemente do banco
   * @test {GET /health} Deve funcionar mesmo com banco desconectado
   */
  it("health deve funcionar mesmo com banco desconectado", async () => {
    // Simula banco desconectado
    prismaMock.user.count.mockRejectedValue(new Error("DB down"));

    const healthResponse = await app.inject({
      method: "GET",
      url: "/health",
    });

    const dbResponse = await app.inject({
      method: "GET",
      url: "/test-db",
    });

    // Health deve funcionar
    expect(healthResponse.statusCode).toBe(200);
    const healthBody = JSON.parse(healthResponse.body);
    expect(healthBody.status).toBe("ok");

    // DB test deve falhar
    expect(dbResponse.statusCode).toBe(200);
    const dbBody = JSON.parse(dbResponse.body);
    expect(dbBody.success).toBe(false);
  });

  /**
   * Testa se endpoints retornam headers corretos
   * @test {GET /health, GET /test-db} Deve retornar content-type JSON
   */
  it("deve retornar content-type application/json", async () => {
    const healthResponse = await app.inject({
      method: "GET",
      url: "/health",
    });

    const dbResponse = await app.inject({
      method: "GET",
      url: "/test-db",
    });

    expect(healthResponse.headers["content-type"]).toContain(
      "application/json",
    );
    expect(dbResponse.headers["content-type"]).toContain("application/json");
  });

  /**
   * Testa resposta do endpoint com banco vazio
   * @test {GET /test-db} Deve retornar contagem zero quando não há usuários
   */
  it("deve retornar contagem zero quando banco está vazio", async () => {
    prismaMock.user.count.mockResolvedValue(0);

    const response = await app.inject({
      method: "GET",
      url: "/test-db",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body).toMatchObject({
      success: true,
      message: "Prisma conectado com sucesso!",
      usersCount: 0,
    });
  });
});
