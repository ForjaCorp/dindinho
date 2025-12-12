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
const isDev = process.env.NODE_ENV !== "production";

/**
 * Configuração do adaptador MariaDB para o Prisma
 *
 * @property {string} host - Endereço do servidor de banco de dados
 * @property {number} port - Porta de conexão (padrão: 3306)
 * @property {string} user - Nome de usuário para autenticação
 * @property {string} password - Senha para autenticação
 * @property {string} database - Nome do banco de dados
 * @property {number} connectionLimit - Número máximo de conexões no pool (padrão: 10)
 * @property {number} connectTimeout - Tempo máximo de espera para conexão em ms (padrão: 20000)
 * @property {number} acquireTimeout - Tempo máximo para adquirir conexão em ms (padrão: 20000)
 * @property {boolean} allowPublicKeyRetrieval - Habilita recuperação de chave pública (desativado em produção)
 * @property {boolean|object} ssl - Configuração SSL (habilitado em produção)
 */
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  connectionLimit: 10,
  connectTimeout: 20000,
  acquireTimeout: 20000,
  // Configurações de segurança para desenvolvimento
  allowPublicKeyRetrieval: isDev,
  ssl: !isDev,
});

/**
 * Instância do Prisma Client configurada para o MariaDB
 * @type {PrismaClient}
 */
export const prisma = new PrismaClient({
  adapter,
  log: isDev ? ["query", "error", "warn"] : ["error"],
});
