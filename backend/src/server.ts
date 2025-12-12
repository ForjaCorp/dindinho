/**
 * @file Ponto de entrada principal do servidor Fastify
 * @description Configura e inicia o servidor HTTP da aplicação
 * @module server
 */

import { buildApp } from "./app";
import "dotenv/config";

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

start();
