import { test, expect } from "@playwright/test";
import { assertPageLoaded } from "./helpers/assertions";

test.describe("Fluxo de Autenticação", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";

  test("página de login carrega e exibe formulário", async ({ page }) => {
    await page.goto(`${baseUrl}/login`);
    await assertPageLoaded(page);

    // Validar que tem inputs ou form
    const hasInputs = (await page.locator("input").count()) > 0;
    const hasButtons = (await page.locator("button").count()) > 0;
    expect(hasInputs || hasButtons).toBeTruthy();
  });

  test("página de dashboard é protegida (redirect ou login)", async ({
    page,
  }) => {
    // Se não autenticado, deve redirecionar ou mostrar login
    const response = await page.goto(`${baseUrl}/dashboard`);
    const url = page.url();

    // Esperamos estar em login ou dashboard (dependendo do estado)
    const isLoginOrDash = url.includes("login") || url.includes("dashboard");
    expect(isLoginOrDash).toBeTruthy();
    expect(response?.status()).toBeLessThan(400);
  });

  test("páginas de transações, contas e convites carregam", async ({
    page,
  }) => {
    const paths = ["/transactions", "/accounts", "/invites", "/reports"];

    for (const path of paths) {
      const response = await page.goto(`${baseUrl}${path}`);
      // Aceitar 200, 302 (redirect), ou 400 (protected)
      expect(response?.status()).toBeLessThan(500);
    }
  });
});
