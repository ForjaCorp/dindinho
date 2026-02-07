import { test, expect } from "@playwright/test";

/**
 * @description Teste de fumaça (smoke test) para validar a infraestrutura E2E.
 * Verifica se o frontend carrega e se os elementos básicos de login estão presentes.
 */
test.describe("Smoke Test - Infraestrutura", () => {
  test("deve carregar a página de login corretamente", async ({ page }) => {
    // Acessa a página inicial (que deve redirecionar para /login devido ao guestGuard/authGuard)
    await page.goto("/");

    // Verifica se fomos redirecionados para o login
    await expect(page).toHaveURL(/.*login/);

    // Verifica se os elementos básicos da página de login estão visíveis via data-testid
    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(page.getByTestId("login-email-input")).toBeVisible();
    await expect(page.getByTestId("login-password-input")).toBeVisible();
    await expect(page.getByTestId("login-submit-button")).toBeVisible();
  });
});
