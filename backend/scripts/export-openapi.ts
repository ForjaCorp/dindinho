import { buildApp } from "../src/app";
import fs from "fs";
import path from "path";

/**
 * Script para exportar a especificação OpenAPI da aplicação para um arquivo JSON.
 * Este arquivo é utilizado pelo portal de documentação do frontend.
 *
 * @async
 * @function exportOpenApi
 */
async function exportOpenApi() {
  const app = buildApp();

  try {
    // Aguarda a aplicação estar pronta (carrega plugins e rotas)
    await app.ready();

    // Obtém o JSON do Swagger
    const openapi = (app as any).swagger();

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

    console.log(
      `✅ Especificação OpenAPI exportada com sucesso para: ${outputPath}`,
    );
  } catch (error) {
    console.error("❌ Erro ao exportar especificação OpenAPI:", error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

exportOpenApi();
