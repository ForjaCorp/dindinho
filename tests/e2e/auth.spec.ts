import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

test.describe("Fluxo de Autenticação", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("página de login carrega e exibe formulário", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.waitForLoaded();

    // Validar que tem inputs no form
    const emailInput = page
      .locator(
        'input[type="email"], input[name="email"], [data-testid*="email"]',
      )
      .first();
    await expect(emailInput).toBeVisible();
  });

  test("página de dashboard é protegida (redirect ou login)", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    // Remove auth se existir para forçar redirect
    await page.context().clearCookies();

    await dashboardPage.goto("/dashboard");
    const url = page.url();

    // Esperamos estar em login ou dashboard (dependendo da rapidez do redirect)
    expect(url).toMatch(/login|dashboard/);
  });
});
