import { PrismaClient } from "@prisma/client";
import { CreateWaitlistDTO } from "@dindinho/shared";

/**
 * Serviço responsável por gerenciar a lista de espera.
 * @class WaitlistService
 */
export class WaitlistService {
  /**
   * Cria uma nova instância do serviço de waitlist.
   * @param {PrismaClient} prisma - Instância do Prisma Client
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * Adiciona um usuário à lista de espera.
   * @async
   * @param {CreateWaitlistDTO} data - Dados do usuário (nome, email, telefone)
   * @returns {Promise<Object>} Registro criado na waitlist
   * @throws {Error} Lança um erro se o email já estiver na lista
   *
   * @example
   * const waitlistService = new WaitlistService(prisma);
   * await waitlistService.join({
   *   name: "Maria Souza",
   *   email: "maria@example.com",
   *   phone: "11988887777"
   * });
   */
  async join(data: CreateWaitlistDTO) {
    const emailNormalized = data.email.trim().toLowerCase();

    // Verifica se já existe
    const existing = await this.prisma.waitlist.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new Error("Email já está na lista de espera.");
    }

    try {
      return await this.prisma.waitlist.create({
        data: {
          name: data.name,
          email: emailNormalized,
          phone: data.phone,
        },
      });
    } catch (error) {
      // P2002: Unique constraint failed
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new Error("Email já está na lista de espera.");
      }
      throw error;
    }
  }
}
