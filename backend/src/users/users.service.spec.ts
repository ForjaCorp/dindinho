/**
 * @file Testes unitários para o UsersService
 * @description Testes para a lógica de criação e gestão de usuários
 * @module users.service.spec
 * @requires vitest
 * @requires vitest-mock-extended
 * @requires @prisma/client
 * @requires bcryptjs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import {
  PrismaClient,
  SystemRole,
  User,
  SignupAllowlist,
} from "@prisma/client";

import { SignupNotAllowedError, UsersService } from "./users.service";

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
 * Conjunto de testes para o UsersService
 * @group unit/users
 */
describe("UsersService", () => {
  let usersService: UsersService;

  beforeEach(() => {
    mockReset(prismaMock);
    usersService = new UsersService(prismaMock);
    process.env.SIGNUP_ALLOWLIST_ENABLED = "false";
  });

  /**
   * Testa a criação de usuário com dados válidos
   * @test {UsersService.create} Deve criar usuário e retornar dados sem senha
   */
  it("deve criar usuário com dados válidos", async () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const mockDate = new Date();

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: validUuid,
      name: "João Silva",
      email: "joao@example.com",
      passwordHash: "hashed-password",
      avatarUrl: null,
      phone: "+5511999999999",
      systemRole: SystemRole.USER,
      createdAt: mockDate,
      updatedAt: mockDate,
    } as User);

    const result = await usersService.create({
      name: "João Silva",
      email: "joao@example.com",
      password: "senha123",
      phone: "+5511999999999",
      acceptedTerms: true,
    });

    expect(result).toEqual({
      id: validUuid,
      name: "João Silva",
      email: "joao@example.com",
      phone: "+5511999999999",
      createdAt: mockDate,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "joao@example.com" },
    });

    const createCall = prismaMock.user.create.mock.calls[0]?.[0];
    expect(createCall).toBeDefined();
    expect(createCall?.data).toMatchObject({
      name: "João Silva",
      email: "joao@example.com",
      phone: "+5511999999999",
    });
    expect(createCall?.data.passwordHash).toBeTypeOf("string");
    expect((createCall?.data.passwordHash as string).length).toBeGreaterThan(0);
  });

  /**
   * Testa a tentativa de criar usuário com email duplicado
   * @test {UsersService.create} Deve lançar erro quando email já existe
   */
  it("deve lançar erro quando email já está em uso", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "existing-user",
      name: "Usuário Existente",
      email: "duplicado@example.com",
      passwordHash: "hash",
      avatarUrl: null,
      phone: null,
      systemRole: SystemRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    await expect(
      usersService.create({
        name: "Novo Usuário",
        email: "duplicado@example.com",
        password: "senha123",
        phone: "+5511999999999",
        acceptedTerms: true,
      }),
    ).rejects.toThrow("Email já cadastrado.");

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "duplicado@example.com" },
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  /**
   * Testa se a senha é corretamente hasheada
   * @test {UsersService.create} Deve gerar hash da senha diferente da original
   */
  it("deve gerar hash da senha corretamente", async () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const password = "senha-secreta";

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: validUuid,
      name: "Test User",
      email: "test@example.com",
      passwordHash: "hashed-password",
      avatarUrl: null,
      phone: "+5511999999999",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    await usersService.create({
      name: "Test User",
      email: "test@example.com",
      password: password,
      phone: "+5511999999999",
      acceptedTerms: true,
    });

    const createCall = prismaMock.user.create.mock.calls[0][0];
    const hashedPassword = createCall.data.passwordHash;

    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword).toHaveLength(60); // bcrypt hash length
  });

  it("deve bloquear criação quando email não está na allowlist", async () => {
    process.env.SIGNUP_ALLOWLIST_ENABLED = "true";
    prismaMock.signupAllowlist.findUnique.mockResolvedValue(null);

    await expect(
      usersService.create({
        name: "Test User",
        email: "NOT_ALLOWED@EXAMPLE.COM",
        password: "senha123",
        phone: "+5511999999999",
        acceptedTerms: true,
      }),
    ).rejects.toBeInstanceOf(SignupNotAllowedError);

    expect(prismaMock.signupAllowlist.findUnique).toHaveBeenCalledWith({
      where: { email: "not_allowed@example.com" },
      select: { id: true },
    });
  });

  it("deve permitir criação quando email está na allowlist", async () => {
    process.env.SIGNUP_ALLOWLIST_ENABLED = "true";
    prismaMock.signupAllowlist.findUnique.mockResolvedValue({
      id: "1",
    } as unknown as SignupAllowlist);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "uuid",
      name: "Test",
      email: "allowed@example.com",
      passwordHash: "hash",
      avatarUrl: null,
      phone: "+5511999999999",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    const result = await usersService.create({
      name: "Test",
      email: "allowed@example.com",
      password: "senha123",
      phone: "+5511999999999",
      acceptedTerms: true,
    });

    expect(result.email).toBe("allowed@example.com");
  });

  /**
   * Testa se campos sensíveis não são retornados
   * @test {UsersService.create} Não deve retornar senha ou outros campos sensíveis
   */
  it("não deve retornar campos sensíveis", async () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const mockDate = new Date();

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: validUuid,
      name: "Test User",
      email: "test@example.com",
      passwordHash: "hashed-password",
      avatarUrl: "http://example.com/avatar.jpg",
      phone: "+5511999999999",
      createdAt: mockDate,
      updatedAt: mockDate,
    } as User);

    const result = await usersService.create({
      name: "Test User",
      email: "test@example.com",
      password: "senha123",
      phone: "+5511999999999",
      acceptedTerms: true,
    });

    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("avatarUrl");
    expect(result).not.toHaveProperty("updatedAt");

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("email");
    expect(result).toHaveProperty("createdAt");
  });

  /**
   * Testa tratamento de erro do banco de dados na verificação de email
   * @test {UsersService.create} Deve propagar erro do banco de dados
   */
  it("deve propagar erro do banco de dados na verificação de email", async () => {
    const dbError = new Error("Conexão falhou");
    prismaMock.user.findUnique.mockRejectedValue(dbError);

    await expect(
      usersService.create({
        name: "Test User",
        email: "test@example.com",
        password: "senha123",
        phone: "+5511999999999",
        acceptedTerms: true,
      }),
    ).rejects.toThrow("Conexão falhou");
  });

  /**
   * Testa tratamento de erro do banco de dados na criação
   * @test {UsersService.create} Deve propagar erro do banco de dados
   */
  it("deve propagar erro do banco de dados na criação", async () => {
    const dbError = new Error("Falha ao criar usuário");

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(dbError);

    await expect(
      usersService.create({
        name: "Test User",
        email: "test@example.com",
        password: "senha123",
        phone: "+5511999999999",
        acceptedTerms: true,
      }),
    ).rejects.toThrow("Falha ao criar usuário");
  });

  /**
   * Testa se o serviço verifica email antes de criar
   * @test {UsersService.create} Deve verificar existência do email primeiro
   */
  it("deve verificar email antes de criar usuário", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "uuid",
      name: "Test",
      email: "test@example.com",
      passwordHash: "hash",
      avatarUrl: null,
      phone: "+5511999999999",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User);

    await usersService.create({
      name: "Test",
      email: "test@example.com",
      password: "senha123",
      phone: "+5511999999999",
      acceptedTerms: true,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledBefore(
      prismaMock.user.create,
    );
  });
});
