import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

/**
 * @description Configuração principal do Playwright para o monorepo Dindinho.
 * Define ambientes, navegadores, servidores de desenvolvimento e orquestração global.
 */
dotenv.config();

export default defineConfig({
  testDir: "./tests/e2e",
  /* Execução em paralelo para maior velocidade */
  fullyParallel: true,
  /* Falha o build no CI se houver test.only no código */
  forbidOnly: !!process.env.CI,
  /* Retentativas em caso de falha (apenas no CI) */
  retries: process.env.CI ? 2 : 0,
  /* Limita workers no CI */
  workers: process.env.CI ? 1 : undefined,
  /* Repórter HTML para visualização de resultados */
  reporter: [["html", { open: "never" }]],

  /* Configurações compartilhadas para todos os projetos */
  use: {
    /* URL base para as ações de teste */
    baseURL: "http://localhost:4200",

    /* Coleta traces e vídeos em caso de falha */
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",

    /* Atributo customizado para seleção de elementos */
    testIdAttribute: "data-testid",
  },

  /* Projetos para diferentes navegadores */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Orquestração global de ambiente */
  globalSetup: require.resolve("./tests/e2e/global-setup"),

  /* Sobe os servidores de Frontend e Backend antes dos testes */
  webServer: [
    {
      command: "npm run dev --workspace=backend",
      url: "http://localhost:3333/health",
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: "mysql://root:root@localhost:3307/dindinho_test",
        PORT: "3333",
        NODE_ENV: "test",
      },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev --workspace=frontend",
      url: "http://localhost:4200",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
