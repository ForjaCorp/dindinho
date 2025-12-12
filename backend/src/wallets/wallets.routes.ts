import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { WalletsService } from "./wallets.service";
import { createWalletSchema, walletSchema } from "@dindinho/shared";

/**
 * Rotas da API para gerenciamento de carteiras.
 *
 * @description
 * Define os endpoints para criação e listagem de carteiras dos usuários.
 * Todas as rotas requerem autenticação via JWT.
 *
 * @example
 * // Registrar rotas no app Fastify
 * app.register(walletsRoutes, { prefix: '/api/wallets' });
 *
 * @param app - Instância do Fastify para registrar as rotas
 */
export async function walletsRoutes(app: FastifyInstance) {
  /**
   * Instância do serviço de carteiras para operações de negócio.
   */
  const service = new WalletsService(prisma);

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
   * Endpoint para criar uma nova carteira.
   *
   * @description
   * Cria uma carteira para o usuário autenticado. Suporta carteiras
   * padrão e cartões de crédito com informações específicas.
   *
   * @example
   * POST /api/wallets
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
  app.post("/", async (request, reply) => {
    const { sub: userId } = request.user as { sub: string };
    const wallet = await service.create(userId, request.body as any);
    return reply.status(201).send(wallet);
  });

  /**
   * Endpoint para listar todas as carteiras do usuário.
   *
   * @description
   * Retorna todas as carteiras pertencentes ao usuário autenticado,
   * ordenadas por data de criação. Inclui informações de cartão
   * de crédito quando aplicável.
   *
   * @example
   * GET /api/wallets
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
  app.get("/", async (request) => {
    const { sub: userId } = request.user as { sub: string };
    return service.findAllByUserId(userId);
  });
}
