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

if (!databaseUrl && process.env.NODE_ENV === "production") {
  console.error("ERRO: DATABASE_URL não encontrada no ambiente de produção!");
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: databaseUrl || "",
  },
});
