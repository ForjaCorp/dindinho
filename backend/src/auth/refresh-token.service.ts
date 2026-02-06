import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes, createHash } from "crypto";

type Logger = {
  info: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

const noopLogger: Logger = {
  info: () => undefined,
};

/**
 * Serviço responsável pelo gerenciamento de Refresh Tokens
 * @class RefreshTokenService
 * @description Implementa rotação de tokens e armazenamento seguro
 */
export class RefreshTokenService {
  private ttlDays: number;
  private logger: Logger;

  constructor(
    private prisma: PrismaClient,
    logger: Logger = noopLogger,
    ttlDays?: number,
  ) {
    this.logger = logger;
    this.ttlDays =
      typeof ttlDays === "number"
        ? ttlDays
        : parseInt(process.env.REFRESH_TOKEN_DAYS ?? "7", 10);
  }

  /**
   * Gera um refresh token seguro
   * @returns {string} Token aleatório de 64 bytes
   */
  private generateToken(): string {
    return randomBytes(64).toString("hex");
  }

  /**
   * Cria um novo refresh token para o usuário
   * @param userId - ID do usuário
   * @param expiresIn - Tempo de expiração em dias (padrão: 7 dias)
   * @returns {Promise<string>} Refresh token gerado
   */
  async createToken(userId: string, expiresIn: number = 7): Promise<string> {
    // Política atual: revogar tokens antigos do mesmo usuário (um por vez)
    await this.revokeUserTokens(userId);

    // Gera token raw que será retornado ao cliente
    const rawToken = this.generateToken();

    // Hash do token para armazenar no banco (protege contra vazamento)
    // Armazenamos o hash em formato binário (32 bytes) para eficiência
    const hashed = createHash("sha256").update(rawToken).digest();

    const days = typeof expiresIn === "number" ? expiresIn : this.ttlDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        token: hashed as Prisma.Bytes,
        userId,
        expiresAt,
      },
    });

    this.logger.info(
      `RefreshToken created for user=${userId} expiresInDays=${days}`,
    );

    // Retorna o token raw — apenas ele é enviado ao cliente
    return rawToken;
  }

  /**
   * Valida um refresh token
   * @param token - Refresh token a validar
   * @returns {Promise<string | null>} ID do usuário se válido, null se inválido
   */
  async validateToken(token: string): Promise<string | null> {
    // Busca pelo hash (binário) do token recebido
    const hashed = createHash("sha256").update(token).digest();

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashed as Prisma.Bytes },
    });

    if (!refreshToken) return null;

    if (refreshToken.expiresAt < new Date()) {
      // Remove token expirado por segurança
      await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });
      this.logger.info(`Expired refresh token removed id=${refreshToken.id}`);
      return null;
    }

    return refreshToken.userId;
  }

  /**
   * Revoga um refresh token específico
   * @param token - Token a revogar
   * @returns {Promise<boolean>} True se revogado com sucesso
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const hashed = createHash("sha256").update(token).digest();
      await this.prisma.refreshToken.delete({
        where: { token: hashed as Prisma.Bytes },
      });
      this.logger.info(`Refresh token revoked`);
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return true;
      }
      this.logger.warn?.("Failed to revoke refresh token", err);
      return false;
    }
  }

  /**
   * Revoga todos os refresh tokens de um usuário
   * @param userId - ID do usuário
   * @returns {Promise<number>} Quantidade de tokens revogados
   */
  async revokeUserTokens(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    this.logger.info(
      `Revoked ${result.count} refresh tokens for user=${userId}`,
    );
    return result.count;
  }

  /**
   * Limpa tokens expirados (maintenance)
   * @returns {Promise<number>} Quantidade de tokens limpos
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    this.logger.info(`Cleaned up ${result.count} expired refresh tokens`);
    return result.count;
  }
}
