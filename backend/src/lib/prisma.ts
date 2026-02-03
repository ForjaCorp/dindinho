/**
 * @file Configuração e exportação da instância do Prisma Client
 * @description Este módulo configura o Prisma Client para se conectar ao banco de dados MariaDB
 * usando as variáveis de ambiente fornecidas, com otimizações para desenvolvimento e produção
 * @module lib/prisma
 * @requires @prisma/client
 * @requires @prisma/adapter-mariadb
 * @requires dotenv/config
 * @version 1.0.0
 * @author Dindinho Team
 *
 * @example
 * // Exemplo de uso em services:
 * import { prisma } from '../lib/prisma';
 *
 * async function getUsers() {
 *   return await prisma.user.findMany();
 * }
 *
 * @example
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
const sslEnabled = process.env.DATABASE_SSL === "true";

export const buildMariaDbAdapterConfig = (url: URL) => {
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    connectionLimit: 10,
    connectTimeout: 20000,
    acquireTimeout: 20000,
    allowPublicKeyRetrieval: isDev || !sslEnabled,
    ssl: sslEnabled,
  };
};

/**
 * Configuração do adaptador MariaDB para o Prisma
 * @description Configurações de conexão otimizadas para desenvolvimento e produção
 * @type {PrismaMariaDb}
 * @property {string} host - Endereço do servidor de banco de dados (extraído do DATABASE_URL)
 * @property {number} port - Porta de conexão (padrão: 3306)
 * @property {string} user - Nome de usuário para autenticação (extraído do DATABASE_URL)
 * @property {string} password - Senha para autenticação (extraído do DATABASE_URL)
 * @property {string} database - Nome do banco de dados (extraído do DATABASE_URL)
 * @property {number} connectionLimit - Número máximo de conexões no pool (padrão: 10)
 * @property {number} connectTimeout - Tempo máximo de espera para conexão em ms (padrão: 20000)
 * @property {number} acquireTimeout - Tempo máximo para adquirir conexão em ms (padrão: 20000)
 * @property {boolean} allowPublicKeyRetrieval - Habilita recuperação de chave pública (desativado em produção)
 * @property {boolean|object} ssl - Configuração SSL (habilitado em produção)
 *
 * @example
 * // Em desenvolvimento: SSL desativado, allowPublicKeyRetrieval ativado
 * // Em produção: SSL ativado, allowPublicKeyRetrieval desativado
 */
const adapter = new PrismaMariaDb(buildMariaDbAdapterConfig(dbUrl));

/**
 * Instância do Prisma Client configurada para o MariaDB
 * @description Cliente Prisma com adaptador MariaDB e logging configurado por ambiente
 * @type {PrismaClient}
 * @global
 *
 * @example
 * // Uso direto em operações de banco:
 * const users = await prisma.user.findMany();
 *
 * @example
 * // Com transações:
 * await prisma.$transaction(async (tx) => {
 *   await tx.user.create({...});
 *   await tx.post.create({...});
 * });
 *
 * @see {@link https://www.prisma.io/docs/concepts/components/prisma-client} Para documentação completa
 * @since 1.0.0
 */
export const prisma = new PrismaClient({
  adapter,
  log: isDev ? ["query", "error", "warn"] : ["error"],
});
