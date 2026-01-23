import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AccountsService } from "./accounts.service";
import {
  CreateAccountDTO,
  createAccountSchema,
  accountSchema,
} from "@dindinho/shared";

/**
 * Rotas da API para gerenciamento de contas.
 *
 * @description
 * Define os endpoints para criação e listagem de contas dos usuários.
 * Todas as rotas requerem autenticação via JWT.
 *
 * @example
 * // Registrar rotas no app Fastify
 * app.register(accountsRoutes, { prefix: '/api/accounts' });
 *
 * @param app - Instância do Fastify para registrar as rotas
 */
export async function accountsRoutes(app: FastifyInstance) {
  /**
   * Instância do serviço de contas para operações de negócio.
   */
  const service = new AccountsService(prisma);

  /**
   * Hook global para este prefixo: verifica o token antes de qualquer handler.
   *
   * @description
   * Intercepta todas as requisições para este prefixo de rotas
   * e valida o token JWT. Lança erro 401 se o token for inválido.
   */
  app.addHook("onRequest", async (request) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      throw { statusCode: 401, message: "Token inválido ou expirado" };
    }
  });

  /**
   * Endpoint para criar uma nova conta.
   *
   * @description
   * Cria uma conta para o usuário autenticado. Suporta contas
   * padrão e cartões de crédito com informações específicas.
   *
   * @example
   * POST /api/accounts
   * {
   *   "name": "Cartão Nubank",
   *   "color": "#8A2BE2",
   *   "icon": "pi-credit-card",
   *   "type": "CREDIT",
   *   "closingDay": 10,
   *   "dueDay": 15,
   *   "limit": 5000,
   *   "brand": "Mastercard"
   * }
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar conta",
        tags: ["accounts"],
        body: createAccountSchema,
        response: {
          201: accountSchema,
          401: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = request.user as { sub: string };
      const payload: CreateAccountDTO = createAccountSchema.parse(request.body);
      const account = await service.create(userId, payload);
      return reply.status(201).send(account);
    },
  );

  /**
   * Endpoint para listar todas as contas do usuário.
   *
   * @description
   * Retorna todas as contas pertencentes ao usuário autenticado,
   * ordenadas por data de criação. Inclui informações de cartão
   * de crédito quando aplicável.
   *
   * @example
   * GET /api/accounts
   * Response: [
   *   {
   *     "id": "uuid",
   *     "name": "Cartão Nubank",
   *     "type": "CREDIT",
   *     "balance": 1500.50,
   *     "creditCardInfo": {
   *       "closingDay": 10,
   *       "dueDay": 15,
   *       "limit": 5000,
   *       "brand": "Mastercard"
   *     }
   *   }
   * ]
   */
  app.withTypeProvider<ZodTypeProvider>().get(
    "/",
    {
      schema: {
        summary: "Listar contas",
        tags: ["accounts"],
        response: {
          200: z.array(accountSchema),
          401: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request) => {
      const { sub: userId } = request.user as { sub: string };
      return service.findAllByUserId(userId);
    },
  );
}
