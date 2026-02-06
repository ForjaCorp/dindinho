import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import { LoginDTO, SystemRole } from "@dindinho/shared";
import { RefreshTokenService } from "./refresh-token.service";
import { sign } from "jsonwebtoken";

export class InvalidCredentialsError extends Error {
  readonly statusCode = 401;
  constructor() {
    super("Credenciais inválidas.");
  }
}

export class InvalidRefreshTokenError extends Error {
  readonly statusCode = 401;
  constructor() {
    super("Refresh token inválido ou expirado.");
  }
}

export class UserNotFoundError extends Error {
  readonly statusCode = 401;
  constructor() {
    super("Usuário não encontrado.");
  }
}

/**
 * Interface para o resultado da autenticação
 * @interface AuthResult
 * @description Define a estrutura de dados retornada após autenticação bem-sucedida
 */
export interface AuthResult {
  id: string;
  name: string;
  email: string;
  systemRole: SystemRole;
  refreshToken: string;
}

/**
 * Serviço responsável pela autenticação de usuários
 * @class AuthService
 * @description Implementa a lógica de autenticação, incluindo validação de credenciais
 * e geração de tokens de acesso com refresh tokens.
 */
export class AuthService {
  /**
   * Cria uma nova instância do serviço de autenticação
   * @param {PrismaClient} prisma - Instância do Prisma Client para acesso ao banco de dados
   * @param {RefreshTokenService} refreshTokenService - Serviço de refresh tokens
   */
  constructor(
    private prisma: PrismaClient,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Autentica um usuário com base nas credenciais fornecidas
   * @async
   * @param {LoginDTO} data - Dados de login do usuário
   * @returns {Promise<AuthResult>} Dados do usuário e refresh token
   * @throws {InvalidCredentialsError} Lança um erro se as credenciais forem inválidas
   */
  async authenticate(data: LoginDTO): Promise<AuthResult> {
    // 1. Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // 2. Verificar senha
    const isPasswordValid = await compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 3. Gerar refresh token
    const refreshToken = await this.refreshTokenService.createToken(user.id);

    // 4. Retornar dados (sem senha/hash)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      systemRole: user.systemRole as SystemRole,
      refreshToken,
    };
  }

  /**
   * Valida um refresh token e retorna o ID do usuário
   * @async
   * @param {string} token - Refresh token a validar
   * @returns {Promise<string | null>} ID do usuário se válido, null se inválido
   */
  async validateRefreshToken(token: string): Promise<string | null> {
    return this.refreshTokenService.validateToken(token);
  }

  /**
   * Revoga um refresh token
   * @async
   * @param {string} token - Token a revogar
   * @returns {Promise<boolean>} True se revogado com sucesso
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    return this.refreshTokenService.revokeToken(token);
  }

  /**
   * Revoga todos os refresh tokens de um usuário
   * @async
   * @param {string} userId - ID do usuário
   * @returns {Promise<number>} Quantidade de tokens revogados
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    return this.refreshTokenService.revokeUserTokens(userId);
  }

  async refreshToken(
    token: string,
  ): Promise<{ newAccessToken: string; newRefreshToken: string }> {
    const userId = await this.refreshTokenService.validateToken(token);

    if (!userId) {
      throw new InvalidRefreshTokenError();
    }

    await this.refreshTokenService.revokeToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const newAccessToken = sign(
      {
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
      },
      process.env.JWT_SECRET as string,
      {
        subject: user.id,
        expiresIn: "15m",
      },
    );

    const newRefreshToken = await this.refreshTokenService.createToken(user.id);

    return { newAccessToken, newRefreshToken };
  }
}
