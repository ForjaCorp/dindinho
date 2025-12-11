import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import { LoginDTO } from "@dindinho/shared";

/**
 * Serviço responsável pela autenticação de usuários
 * @class AuthService
 * @description Implementa a lógica de autenticação, incluindo validação de credenciais
 * e geração de tokens de acesso.
 */
export class AuthService {
  /**
   * Cria uma nova instância do serviço de autenticação
   * @param {PrismaClient} prisma - Instância do Prisma Client para acesso ao banco de dados
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * Autentica um usuário com base nas credenciais fornecidas
   * @async
   * @param {LoginDTO} data - Dados de login do usuário
   * @returns {Promise<{id: string, name: string, email: string}>} Dados do usuário autenticado
   * @throws {Error} Lança um erro se as credenciais forem inválidas
   *
   * @example
   * const authService = new AuthService(prisma);
   * try {
   *   const user = await authService.authenticate({
   *     email: "usuario@exemplo.com",
   *     password: "senha-segura"
   *   });
   *   console.log("Usuário autenticado:", user);
   * } catch (error) {
   *   console.error("Falha na autenticação:", error.message);
   * }
   */
  async authenticate(data: LoginDTO) {
    // 1. Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("Credenciais inválidas.");
    }

    // 2. Verificar senha
    const isPasswordValid = await compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error("Credenciais inválidas.");
    }

    // 3. Retornar dados (sem senha/hash)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
