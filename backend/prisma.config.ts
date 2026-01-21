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

// Permitir execução no CI/Build onde DATABASE_URL pode não ser necessária para generate
// ou será injetada via environment variables do CI
if (!databaseUrl && process.env.NODE_ENV !== "production" && !process.env.CI) {
  throw new Error("DATABASE_URL não definida. Verifique o arquivo .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: databaseUrl || "postgresql://dummy:dummy@localhost:5432/dummy", // Fallback para generate
  },
});
