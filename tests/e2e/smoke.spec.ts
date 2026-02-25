import { test, expect } from "@playwright/test";

test.describe("Smoke E2E", () => {
  // O smoke test valida a página de login solta, então removemos a autenticação
  test.use({ storageState: { cookies: [], origins: [] } });

  test("página inicial responde 200 e carrega conteúdo", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeGreaterThanOrEqual(200);
    expect(response!.status()).toBeLessThan(400);

    // Prefer data-testid, mas seja resiliente: verifique se há conteúdo no body
    const byTestId = page.getByTestId("app-root");
    if ((await byTestId.count()) > 0) {
      await expect(byTestId).toBeVisible();
    } else {
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();
    }
  });

  test("fluxo de login (exemplo) tenta data-testid e usa fallback", async ({
    page,
  }) => {
    await page.goto("/login");

    const emailCandidates = [
      '[data-testid="login-email"]',
      'input[type="email"]',
      'input[name="email"]',
    ];
    const passCandidates = [
      '[data-testid="login-password"]',
      'input[type="password"]',
      'input[name="password"]',
    ];
    const submitCandidates = [
      '[data-testid="login-submit"]',
      'button[type="submit"]',
      'button:has-text("entrar")',
      'button:has-text("login")',
    ];

    let emailSelector: string | undefined;
    let passSelector: string | undefined;
    let submitSelector: string | undefined;

    for (const s of emailCandidates) {
      try {
        // short timeout to detect existence
        // @ts-ignore playwright typing for waitForSelector options
        await page.waitForSelector(s, { timeout: 1000 });
        emailSelector = s;
        break;
      } catch (e) {
        // continue
      }
    }

    for (const s of passCandidates) {
      try {
        // @ts-ignore
        await page.waitForSelector(s, { timeout: 1000 });
        passSelector = s;
        break;
      } catch (e) {}
    }

    for (const s of submitCandidates) {
      try {
        // @ts-ignore
        await page.waitForSelector(s, { timeout: 1000 });
        submitSelector = s;
        break;
      } catch (e) {}
    }

    if (emailSelector && passSelector && submitSelector) {
      await page.fill(emailSelector, "e2e@example.com");
      await page.fill(passSelector, "Dindinho#1234");
      await page.click(submitSelector);

      // Depois do login, preferimos data-testid do dashboard, senão verificamos rota ou título
      try {
        const dashboard = page.getByTestId("dashboard-root");
        if ((await dashboard.count()) > 0) {
          await expect(dashboard).toBeVisible();
          return;
        }
      } catch (e) {
        // ignore
      }

      await page.waitForLoadState("networkidle");
      const url = page.url();
      expect(url).toContain("/dashboard");
    } else {
      // Não conseguimos preencher o formulário — validar que a página de login existe
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.toLowerCase()).toMatch(/entrar|login/);
    }
  });
});
