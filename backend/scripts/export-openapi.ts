import { buildApp } from "../src/app";
import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";

/**
 * Interface estendida para incluir o método swagger do plugin @fastify/swagger.
 */
interface FastifySwaggerInstance extends FastifyInstance {
  swagger: () => Record<string, unknown>;
}

const writeOut = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const writeErr = (message: string) => {
  process.stderr.write(`${message}\n`);
};

/**
 * Script para exportar a especificação OpenAPI da aplicação para um arquivo JSON.
 * Este arquivo é utilizado pelo portal de documentação do frontend.
 *
 * @async
 * @function exportOpenApi
 */
async function exportOpenApi() {
  const app = buildApp() as unknown as FastifySwaggerInstance;

  try {
    // Aguarda a aplicação estar pronta (carrega plugins e rotas)
    await app.ready();

    // Obtém o JSON do Swagger
    const openapi = app.swagger();

    // Define o caminho de destino
    const outputPath = path.resolve(
      __dirname,
      "../../docs/30-api/openapi.json",
    );
    const outputDir = path.dirname(outputPath);

    // Garante que o diretório existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Salva o arquivo com formatação
    fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2), "utf8");

    writeOut(
      `✅ Especificação OpenAPI exportada com sucesso para: ${outputPath}`,
    );
  } catch (error) {
    writeErr("❌ Erro ao exportar especificação OpenAPI:");
    if (error instanceof Error) {
      writeErr(error.message);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

exportOpenApi();
