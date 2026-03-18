import { test, expect } from "@playwright/test";
import { createTestUser } from "../helpers/auth";
import { testUser } from "../helpers/fixtures";
import { DashboardPage } from "../pages/DashboardPage";

test.describe("Fluxos Complexos E2E", () => {
  const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:3333";

  test("autenticar via API e validar dashboard carregado", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const email = testUser.email;
    const password = testUser.password;

    await createTestUser(apiUrl, email, password).catch(() => undefined);

    const res = await page.request.post(`${apiUrl}/api/auth/login`, {
      data: { email, password },
    });

    expect(res.ok).toBeTruthy();
    const { token, refreshToken } = await res.json();

    await page.addInitScript(
      ({ t, rt }) => {
        try {
          localStorage.setItem("dindinho_token", t);
          localStorage.setItem("dindinho_refresh_token", rt);
        } catch (err) {}
      },
      { t: token, rt: refreshToken },
    );

    // Navegar usando POM
    await dashboardPage.navigate();
    await expect(page).toHaveURL(/.*dashboard/);
    await dashboardPage.assertBalanceVisible();
  });
});
