/**
 * Configuração e exportação da instância do Prisma Client.
 *
 * Este módulo configura o Prisma Client para se conectar ao banco de dados MariaDB
 * usando as variáveis de ambiente fornecidas.
 *
 * @module lib/prisma
 * @requires @prisma/client
 * @requires @prisma/adapter-mariadb
 * @requires dotenv/config
 *
 * @example
 * // Exemplo de uso:
 * import { prisma } from '@/lib/prisma';
 *
 * async function getUsers() {
 *   return await prisma.user.findMany();
 * }
 */

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

// Valida se a variável de ambiente está definida
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida no arquivo .env");
}

const dbUrl = new URL(process.env.DATABASE_URL);

/**
 * Configuração do adaptador MariaDB para o Prisma
 */
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
});

/**
 * Instância do Prisma Client configurada para o MariaDB
 * @type {PrismaClient}
 */
export const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});
