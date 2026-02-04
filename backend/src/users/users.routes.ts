/**
 * @file Rotas de usuários da aplicação
 * @description Define os endpoints para criação e gestão de usuários
 * @module users.routes
 * @requires fastify
 * @requires fastify-type-provider-zod
 * @requires zod
 * @requires ../lib/prisma
 * @requires ./users.service
 * @requires @dindinho/shared
 */

import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  SignupNotAllowedError,
  EmailAlreadyExistsError,
  UsersService,
} from "./users.service";
import { apiErrorResponseSchema, createUserSchema } from "@dindinho/shared";
import { getHttpErrorLabel } from "../lib/get-http-error-label";

/**
 * Configura as rotas relacionadas a usuários
 * @async
 * @function usersRoutes
 * @description Registra os endpoints de gestão de usuários na instância do Fastify
 * @param {FastifyInstance} app - Instância do Fastify onde as rotas serão registradas
 * @returns {Promise<void>} Promise vazia após configuração das rotas
 * @throws {Error} Pode propagar erros do serviço de usuários
 *
 * @example
 * // No seu arquivo app.ts:
 * import { usersRoutes } from './users/users.routes';
 *
 * const app = fastify();
 * await app.register(usersRoutes);
 *
 * @since 1.0.0
 * @author Dindinho Team
 */
export async function usersRoutes(app: FastifyInstance) {
  const service = new UsersService(prisma);

  /**
   * Rota para criação de novo usuário
   * @route POST /api/users
   * @description Cria um novo usuário no sistema com senha hasheada
   * @access Public
   * @param {Object} request.body - Dados do novo usuário
   * @param {string} request.body.name - Nome completo do usuário (mínimo 2 caracteres)
   * @param {string} request.body.email - Email válido e único do usuário
   * @param {string} request.body.phone - Telefone válido e único do usuário
   * @param {string} request.body.password - Senha com mínimo 6 caracteres
   * @returns {Promise<Object>} Dados do usuário criado (sem senha)
   * @returns {string} returns.id - UUID único do usuário
   * @returns {string} returns.name - Nome do usuário
   * @returns {string} returns.email - Email do usuário
   * @returns {string} returns.phone - Telefone do usuário
   * @returns {string} returns.createdAt - Data de criação em formato ISO
   * @throws {409} Retorna quando o email já está cadastrado
   * @throws {400} Retorna quando os dados de entrada são inválidos
   * @throws {500} Retorna quando ocorre erro interno do servidor
   *
   * @example
   * // Request body:
   * {
   *   "name": "João Silva",
   *   "email": "joao@exemplo.com",
   *   "phone": "+5511999999999",
   *   "password": "senha123"
   * }
   *
   * // Response 201:
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "name": "João Silva",
   *   "email": "joao@exemplo.com",
   *   "phone": "+5511999999999",
   *   "createdAt": "2023-01-01T00:00:00.000Z"
   * }
   *
   * // Response 409:
   * {
   *   "message": "Email já cadastrado."
   * }
   *
   * @since 1.0.0
   * @see {@link https://www.owasp.org/index.php/Password_Storage_Cheat_Sheet} Para boas práticas de armazenamento de senhas
   */
  app.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        summary: "Criar novo usuário",
        tags: ["users"],
        body: createUserSchema,
        response: {
          201: z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string().email(),
            phone: z.string(),
            createdAt: z.string().datetime(),
          }),
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const data = request.body;

      try {
        const user = await service.create(data);
        return reply.status(201).send({
          ...user,
          createdAt: user.createdAt.toISOString(),
        });
      } catch (error) {
        if (error instanceof SignupNotAllowedError) {
          const statusCode = error.statusCode;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: "SIGNUP_NOT_ALLOWED",
          });
        }

        if (error instanceof EmailAlreadyExistsError) {
          const statusCode = error.statusCode;
          return reply.code(statusCode).send({
            statusCode,
            error: getHttpErrorLabel(statusCode),
            message: error.message,
            code: "EMAIL_ALREADY_EXISTS",
          });
        }

        throw error;
      }
    },
  );
}
