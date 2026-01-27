/**
 * @file Testes de integração para as rotas de usuários
 * @description Testes para as rotas de manipulação de usuários
 * @module users.routes.spec
 * @requires vitest
 * @requires vitest-mock-extended
 * @requires @prisma/client
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, Role, User } from "@prisma/client";

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

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockReset(prismaMock);
    process.env.SIGNUP_ALLOWLIST_ENABLED = "false";
  });

  /**
   * Testa a criação de um novo usuário com sucesso
   * @test {POST /users} Deve retornar 201 e os dados do usuário criado
   */
  it("deve criar um usuário com sucesso", async () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: validUuid,
      name: "Vini Teste",
      email: "vini@teste.com",
      passwordHash: "hash-seguro",
      avatarUrl: null,
      role: Role.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Vini Teste",
        email: "vini@teste.com",
        password: "SenhaForte123@",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(validUuid);
    expect(body.password).toBeUndefined();
  });

  it("deve bloquear criação quando email não está na allowlist", async () => {
    process.env.SIGNUP_ALLOWLIST_ENABLED = "true";
    prismaMock.signupAllowlist.findUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Vini Teste",
        email: "vini@teste.com",
        password: "SenhaForte123@",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).message).toBe("Cadastro não permitido");
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
      role: Role.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Novo Tentativa",
        email: "duplicado@teste.com",
        password: "SenhaForte123@",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body).message).toBe("Email já cadastrado.");
  });

  /**
   * Testa a validação de campos obrigatórios
   * @test {POST /users} Deve retornar 400 quando campos obrigatórios estiverem faltando
   */
  it("deve retornar 400 quando faltar campos obrigatórios", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("Required");
  });

  /**
   * Testa a validação de formato de email
   * @test {POST /users} Deve retornar 400 para email inválido
   */
  it("deve retornar 400 para email inválido", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Teste",
        email: "email-invalido",
        password: "senha123",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("Email inválido");
  });

  /**
   * Testa a validação de tamanho mínimo de senha
   * @test {POST /users} Deve retornar 400 para senha muito curta
   */
  it("deve retornar 400 para senha muito curta", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Teste",
        email: "teste@exemplo.com",
        password: "123",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("Senha deve ter pelo menos 8 caracteres");
  });

  /**
   * Testa o tratamento de erros inesperados
   * @test {POST /users} Deve retornar 500 para erros inesperados
   */
  it("deve retornar 500 para erros inesperados", async () => {
    prismaMock.user.findUnique.mockRejectedValue(
      new Error("Erro inesperado no banco de dados"),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Teste",
        email: "erro@teste.com",
        password: "SenhaForte123@",
      },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      statusCode: 500,
      error: "Internal Server Error",
    });
    expect(body.message).toBeDefined();
  });

  /**
   * Testa se campos sensíveis não são retornados na resposta
   * @test {POST /users} Não deve retornar campos sensíveis
   */
  it("não deve retornar campos sensíveis na resposta", async () => {
    const mockDate = new Date();
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: validUuid,
      name: "Teste",
      email: "teste@exemplo.com",
      passwordHash: "hash-seguro",
      createdAt: mockDate,
      updatedAt: mockDate,
    } as User);

    const response = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: {
        name: "Teste",
        email: "teste@exemplo.com",
        password: "SenhaForte123@",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    // Verifica se os campos sensíveis não estão presentes
    expect(body).not.toHaveProperty("passwordHash");
    expect(body).not.toHaveProperty("password");

    // Verifica se os campos necessários estão presentes
    expect(body).toMatchObject({
      id: validUuid,
      name: "Teste",
      email: "teste@exemplo.com",
      createdAt: mockDate.toISOString(),
    });
  });
});
