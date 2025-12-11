/**
 * @file Testes de integração para as rotas de usuários
 * @description Testes para as rotas de manipulação de usuários
 * @module users.routes.spec
 * @requires vitest
 * @requires vitest-mock-extended
 * @requires @prisma/client
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { buildApp } from "../app";
import { prisma } from "../lib/prisma";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

/**
 * Conjunto de testes para as rotas de usuários
 * @group integration/users
 */
describe("Users Routes", () => {
  const app = buildApp();

  beforeEach(() => {
    mockReset(prismaMock);
  });

  /**
   * Testa a criação de um novo usuário com sucesso
   * @test {POST /users} Deve retornar 201 e os dados do usuário criado
   */
  it("deve criar um usuário com sucesso", async () => {
    // CORREÇÃO 1: Usar um UUID válido
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: validUuid,
      name: "Vini Teste",
      email: "vini@teste.com",
      passwordHash: "hash-seguro",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: {
        name: "Vini Teste",
        email: "vini@teste.com",
        password: "senha-secreta-123",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(validUuid);
    expect(body.password).toBeUndefined();
  });

  /**
   * Testa a tentativa de criar um usuário com email já existente
   * @test {POST /users} Deve retornar 409 quando o email já estiver em uso
   */
  it("não deve criar usuário com email duplicado", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "existente",
      name: "Já Existe",
      email: "duplicado@teste.com",
      passwordHash: "hash",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: {
        name: "Novo Tentativa",
        email: "duplicado@teste.com",
        // CORREÇÃO 2: Usar uma senha válida (> 6 chars) para passar na validação do Zod
        password: "senha-valida",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body).message).toBe("Email já cadastrado.");
  });
});
