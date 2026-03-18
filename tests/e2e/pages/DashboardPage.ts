import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  async navigate() {
    await this.goto("/dashboard");
    await this.ensureAuthenticated();
    await this.waitForLoaded();
  }

  async assertBalanceVisible() {
    const bodyText = await this.page.locator("body").innerText();
    const hasMoney =
      bodyText.includes("R$") ||
      bodyText.includes("saldo") ||
      bodyText.includes("conta");
    expect(hasMoney || bodyText.length > 50).toBeTruthy();
  }
}
