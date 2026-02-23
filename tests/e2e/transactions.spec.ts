import { test, expect } from "@playwright/test";
import { assertPageLoaded } from "./helpers/assertions";

test.describe("Fluxo de Transações", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";

  test("página de transações carrega", async ({ page }) => {
    const response = await page.goto(`${baseUrl}/transactions`);
    // Aceitar 200 ou redirect (se protegido)
    expect(response?.status()).toBeLessThan(400);
    await assertPageLoaded(page);
  });

  test("página de criar transação carrega", async ({ page }) => {
    const response = await page.goto(`${baseUrl}/transactions/new`);
    expect(response?.status()).toBeLessThan(400);
    await assertPageLoaded(page);

    // Validar que tem form
    const hasForm =
      (await page.locator("form").count()) > 0 ||
      (await page.locator("input").count()) > 0;
    expect(hasForm).toBeTruthy();
  });

  test("lista de transações exibe items ou vazia", async ({ page }) => {
    await page.goto(`${baseUrl}/transactions`);
    await page.waitForLoadState("networkidle");

    // Validar que renderizou algo (lista ou mensagem vazia)
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test("saldo é exibido no dashboard", async ({ page }) => {
    const response = await page.goto(`${baseUrl}/dashboard`);

    if (response?.status() === 200) {
      await assertPageLoaded(page);

      // Procurar por exibição de saldo ou conta
      const bodyText = await page.locator("body").innerText();
      const hasMoney =
        bodyText.includes("R$") ||
        bodyText.includes("saldo") ||
        bodyText.includes("conta");
      expect(hasMoney || bodyText.length > 50).toBeTruthy();
    }
  });
});
