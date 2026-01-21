import { defineConfig } from "@prisma/config";
import "dotenv/config";

/**
 * Configuração do Prisma CLI para o workspace do backend.
 *
 * @description
 * Lê `DATABASE_URL` do ambiente (carregada via dotenv) e falha cedo quando ausente,
 * evitando comandos do Prisma rodarem com configuração incompleta.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não definida. Verifique o arquivo .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: databaseUrl,
  },
});
