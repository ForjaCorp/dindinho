/**
 * @file Testes unitários para o AuthService
 * @description Testes para a lógica de autenticação de usuários
 * @module auth.service.spec
 * @requires vitest
 * @requires vitest-mock-extended
 * @requires @prisma/client
 * @requires bcryptjs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import { AuthService } from "./auth.service";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { prisma } from "../lib/prisma";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

/**
 * Conjunto de testes para o AuthService
 * @group unit/auth
 */
describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    mockReset(prismaMock);
    authService = new AuthService(prismaMock);
  });

  /**
   * Testa a autenticação com credenciais válidas
   * @test {AuthService.authenticate} Deve retornar dados do usuário quando credenciais são válidas
   */
  it("deve autenticar usuário com credenciais válidas", async () => {
    const password = "senha-secreta";
    const passwordHash = await hash(password, 8);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "uuid-user",
      name: "Usuario Teste",
      email: "teste@auth.com",
      passwordHash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await authService.authenticate({
      email: "teste@auth.com",
      password: password,
    });

    expect(result).toEqual({
      id: "uuid-user",
      name: "Usuario Teste",
      email: "teste@auth.com",
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "teste@auth.com" },
    });
  });

  /**
   * Testa a autenticação com email inexistente
   * @test {AuthService.authenticate} Deve lançar erro quando usuário não existe
   */
  it("deve lançar erro quando usuário não existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.authenticate({
        email: "inexistente@teste.com",
        password: "senha123",
      }),
    ).rejects.toThrow("Credenciais inválidas.");

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "inexistente@teste.com" },
    });
  });

  /**
   * Testa a autenticação com senha incorreta
   * @test {AuthService.authenticate} Deve lançar erro quando senha está incorreta
   */
  it("deve lançar erro quando senha está incorreta", async () => {
    const correctPasswordHash = await hash("senha-correta", 8);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "uuid-user",
      name: "Usuario Teste",
      email: "teste@auth.com",
      passwordHash: correctPasswordHash,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(
      authService.authenticate({
        email: "teste@auth.com",
        password: "senha-incorreta",
      }),
    ).rejects.toThrow("Credenciais inválidas.");
  });

  /**
   * Testa a autenticação quando ocorre erro no banco de dados
   * @test {AuthService.authenticate} Deve propagar erro do banco de dados
   */
  it("deve propagar erro do banco de dados", async () => {
    const dbError = new Error("Conexão falhou");
    prismaMock.user.findUnique.mockRejectedValue(dbError);

    await expect(
      authService.authenticate({
        email: "teste@auth.com",
        password: "senha123",
      }),
    ).rejects.toThrow("Conexão falhou");
  });

  /**
   * Testa se campos sensíveis não são retornados
   * @test {AuthService.authenticate} Não deve retornar senha ou hash
   */
  it("não deve retornar campos sensíveis", async () => {
    const password = "senha-secreta";
    const passwordHash = await hash(password, 8);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "uuid-user",
      name: "Usuario Teste",
      email: "teste@auth.com",
      passwordHash,
      avatarUrl: "http://example.com/avatar.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await authService.authenticate({
      email: "teste@auth.com",
      password: password,
    });

    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("avatarUrl");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});
