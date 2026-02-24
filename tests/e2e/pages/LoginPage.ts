import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  async navigate() {
    await this.goto("/login");
  }

  async waitForLoaded() {
    await super.waitForLoaded();
    await this.page.waitForSelector(
      '[data-testid="login-email-input"], input#email, input[type="email"]',
      { state: "visible", timeout: 30_000 },
    );
  }

  async login(email: string, pass: string) {
    await this.ensureAuthenticated(); // No caso de já estar logado por algum motivo
    await this.page.fill(
      '[data-testid="login-email-input"], input#email, input[type="email"]',
      email,
    );
    await this.page.fill(
      '[data-testid="login-password-input"] input, input#password, input[type="password"]',
      pass,
    );
    await this.page.click(
      '[data-testid="login-submit-button"], button[type="submit"]',
    );
  }
}
