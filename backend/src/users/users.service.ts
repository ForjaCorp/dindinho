import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { CreateUserDTO } from "@dindinho/shared";

export class SignupNotAllowedError extends Error {
  readonly statusCode = 403;

  constructor() {
    super("Cadastro não permitido");
  }
}

/**
 * Serviço responsável por operações relacionadas a usuários
 * @class UsersService
 */
export class UsersService {
  /**
   * Cria uma nova instância do serviço de usuários
   * @param {PrismaClient} prisma - Instância do Prisma Client
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria um novo usuário no sistema
   * @async
   * @param {CreateUserDTO} data - Dados do usuário a ser criado
   * @returns {Promise<Object>} Dados do usuário criado (sem a senha)
   * @throws {Error} Lança um erro se o email já estiver em uso
   *
   * @example
   * const userService = new UsersService(prisma);
   * const newUser = await userService.create({
   *   name: "João Silva",
   *   email: "joao@example.com",
   *   password: "senha123"
   * });
   */
  async create(data: CreateUserDTO) {
    const emailNormalized = data.email.trim().toLowerCase();
    await this.assertSignupAllowed(emailNormalized);

    // 1. Verificar se o email já existe
    const userExists = await this.prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (userExists) {
      throw new Error("Email já cadastrado.");
    }

    // 2. Hash da senha
    const passwordHash = await hash(data.password, 8);

    // 3. Criar usuário no banco
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: emailNormalized,
        passwordHash,
      },
    });

    // 4. Retornar usuário sem a senha (segurança)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private async assertSignupAllowed(email: string) {
    if (process.env.SIGNUP_ALLOWLIST_ENABLED === "false") return;

    const allowlistEntry = await this.prisma.signupAllowlist.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!allowlistEntry) {
      throw new SignupNotAllowedError();
    }
  }
}
