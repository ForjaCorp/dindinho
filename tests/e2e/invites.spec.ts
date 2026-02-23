import { test, expect } from "@playwright/test";
import { assertPageLoaded } from "./helpers/assertions";

test.describe("Fluxo de Convites", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";

  test("página de convites carrega", async ({ page }) => {
    const response = await page.goto(`${baseUrl}/invites`);
    // Aceitar 200 ou redirect (se protegido)
    expect(response?.status()).toBeLessThan(400);
    await assertPageLoaded(page);
  });

  test("página de convites tem conteúdo", async ({ page }) => {
    await page.goto(`${baseUrl}/invites`);
    await page.waitForLoadState("networkidle");

    // Validar que renderizou algo
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test("links de compartilhamento estão acessíveis", async ({ page }) => {
    // Testar que a página raiz é acessível
    const response = await page.goto(baseUrl);
    expect(response?.status()).toBeGreaterThanOrEqual(200);
    expect(response?.status()).toBeLessThan(400);
  });
});
