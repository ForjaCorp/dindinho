/**
 * @file Ponto de entrada principal do servidor Fastify
 * @description Configura e inicia o servidor HTTP da aplicação
 * @module server
 */

import { buildApp } from "./app";
import { prisma } from "./lib/prisma";
import "dotenv/config";
import { HealthCheckDTO, DbTestDTO } from "@dindinho/shared";

const app = buildApp();

/**
 * Inicia o servidor HTTP
 * @async
 * @function start
 * @throws {Error} Se houver erro ao iniciar o servidor
 * @returns {Promise<void>}
 */
const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`\n🚀 SERVIDOR ONLINE em http://localhost:${port}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

/**
 * Endpoint de verificação de saúde da API
 * @route GET /health
 * @returns {Promise<HealthCheckDTO>} Status da aplicação e timestamp
 * @description Verifica se a API está funcionando corretamente
 * @example
 * // Response 200 OK
 * {
 *   status: "ok",
 *   timestamp: "2023-01-01T00:00:00.000Z",
 *   app: "Dindinho API"
 * }
 */
app.get<{ Reply: HealthCheckDTO }>("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(), // Melhor retornar ISO string
    app: "Dindinho API",
  };
});

/**
 * Endpoint para teste de conexão com o banco de dados
 * @route GET /test-db
 * @returns {Promise<DbTestDTO>} Resultado do teste de conexão
 * @description Testa a conexão com o banco de dados e retorna informações sobre o estado da conexão
 * @example
 * // Response 200 OK (sucesso)
 * {
 *   success: true,
 *   message: "Prisma conectado com sucesso!",
 *   usersCount: 5
 * }
 *
 * @example
 * // Response 200 OK (erro)
 * {
 *   success: false,
 *   error: "Erro na conexão via Prisma",
 *   details: "Could not connect to database..."
 * }
 */
app.get<{ Reply: DbTestDTO }>("/test-db", async () => {
  try {
    const usersCount = await prisma.user.count();
    return {
      success: true,
      message: "Prisma conectado com sucesso!",
      usersCount,
    };
  } catch (error) {
    app.log.error(error);
    return {
      success: false,
      error: "Erro na conexão via Prisma",
      details: String(error),
    };
  }
});

start();
