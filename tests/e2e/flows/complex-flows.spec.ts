import { test, expect } from "@playwright/test";
import { createTestUser } from "../helpers/auth";
import { testUser } from "../helpers/fixtures";

test.describe("Fluxos Complexos E2E", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";
  const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:3333";

  test("autenticar via API e validar dashboard carregado", async ({ page }) => {
    // Usar usuário de fixture já semeado no banco de testes
    const email = testUser.email;
    const password = testUser.password;

    // Tenta criar usuário via API (se endpoint disponível), senão usa usuário semeado
    await createTestUser(apiUrl, email, password).catch(() => undefined);

    // Autenticar via API e setar tokens no localStorage
    const res = await page.request.post(`${apiUrl}/api/auth/login`, {
      data: { email, password },
    });

    expect(res.ok).toBeTruthy();

    const body = await res.json();
    const token = body.token;
    const refreshToken = body.refreshToken;

    // Setar tokens antes de qualquer script da aplicação usando addInitScript
    await page.addInitScript(
      ({ token, refreshToken }) => {
        try {
          localStorage.setItem("dindinho_token", token);
          localStorage.setItem("dindinho_refresh_token", refreshToken);
        } catch (err) {
          // noop
        }
      },
      { token, refreshToken },
    );

    // Navegar para dashboard
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Verificar que não estamos mais na página de login
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=/saldo total/i").first()).toBeVisible();
  });
});
