import { Page, expect } from "@playwright/test";

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";
    await this.page.goto(`${baseUrl}${path}`);
  }

  async waitForLoaded() {
    const body = this.page.locator("body");
    await expect(body).not.toBeEmpty();
  }

  async assertToast(message: string | RegExp) {
    const toast = this.page.locator(
      '[data-testid="toast"], [role="alert"], .toast, .notification, p-toastitem, .p-toast-message, .p-message',
    );
    await expect(toast.first()).toBeVisible({ timeout: 10_000 });
    await expect(toast.first()).toContainText(message);
  }

  /**
   * Utilitário para lidar com componentes de input que podem estar aninhados (ex: PrimeNG)
   */
  protected async fillInput(
    testId: string,
    value: string,
    fallbackSelector?: string,
  ) {
    let locator = this.page.getByTestId(testId);
    if ((await locator.count()) === 0 && fallbackSelector) {
      locator = this.page.locator(fallbackSelector);
    }

    await locator.waitFor({ state: "visible" });

    // Se o locator for um componente wrapper, tenta encontrar o input real dentro
    const input = locator.locator("input, textarea").first();
    if ((await input.count()) > 0) {
      await input.fill(value);
    } else {
      await locator.fill(value);
    }
  }

  protected async clickButton(testId: string, fallbackName?: string | RegExp) {
    let btn = this.page.getByTestId(testId);
    if ((await btn.count()) === 0 && fallbackName) {
      btn = this.page.getByRole("button", { name: fallbackName }).last();
    }
    await btn.waitFor({ state: "visible", timeout: 10_000 });
    await btn.click();
  }

  /**
   * Garante que o usuário está logado. Se estiver na tela de login, realiza a autenticação.
   */
  async ensureAuthenticated() {
    await this.page.waitForLoadState("networkidle");
    const url = this.page.url();

    if (url.includes("/login")) {
      console.log(
        "Detectado redirecionamento para login. Autenticando com seletores resilientes...",
      );

      const emailWrapper = this.page
        .locator(
          'input[type="email"], input[name="email"], [data-testid*="email"]',
        )
        .first();
      const passWrapper = this.page
        .locator(
          'input[type="password"], input[name="password"], [data-testid*="password"]',
        )
        .first();
      const submit = this.page
        .locator(
          'button[type="submit"], button:has-text("entrar"), button:has-text("login"), [data-testid*="submit"]',
        )
        .first();

      await emailWrapper.waitFor({ state: "visible", timeout: 10_000 });

      // Lógica resiliente para inputs PrimeNG (procura o input real dentro do wrapper se necessário)
      const fillResilient = async (wrapper: any, value: string) => {
        const inner = wrapper.locator("input, textarea").first();
        if ((await inner.count()) > 0) {
          await inner.fill(value);
        } else {
          await wrapper.fill(value);
        }
      };

      await fillResilient(emailWrapper, "e2e@example.com");
      await fillResilient(passWrapper, "Dindinho#1234");
      await submit.click();

      console.log("Aguardando redirecionamento pós-login...");
      await this.page.waitForURL(
        /\/(dashboard|home|app|accounts|transactions|invites)/,
        { timeout: 45_000 },
      );
      console.log("Autenticação resiliente concluída.");
    }
  }
}
