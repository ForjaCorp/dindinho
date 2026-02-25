import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    headless: true,
    trace: "on-first-retry",
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4200",
    storageState: "tests/e2e/state/auth.json",
  },
  globalSetup: "tests/e2e/global-setup.ts",
  outputDir: "test-results/e2e",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
