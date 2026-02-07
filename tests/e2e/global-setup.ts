import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

/**
 * @description Setup global para os testes E2E do Dindinho.
 * Orquestra a subida do banco de dados via Docker e aplica as migrações do Prisma.
 *
 * @param {FullConfig} config - Configuração completa do Playwright.
 * @returns {Promise<void>}
 */
async function globalSetup(config: FullConfig) {
  try {
    // 1. Iniciar Docker Compose de teste
    execSync("docker compose -f docker-compose.test.yml up -d", {
      stdio: "inherit",
    });

    // 2. Aguardar o banco estar saudável
    let healthy = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!healthy && attempts < maxAttempts) {
      try {
        const status = execSync(
          'docker inspect --format="{{.State.Health.Status}}" dindinho_mysql_test',
        )
          .toString()
          .trim();
        if (status === "healthy") {
          healthy = true;
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (e: unknown) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!healthy) {
      throw new Error("❌ Banco de dados não ficou saudável a tempo.");
    }

    // 3. Rodar migrações do Prisma no banco de teste
    const databaseUrl = "mysql://root:root@localhost:3307/dindinho_test";

    execSync("npx prisma migrate deploy", {
      cwd: path.join(process.cwd(), "backend"),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });
  } catch (error: unknown) {
    throw error;
  }
}

export default globalSetup;
