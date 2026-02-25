import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AccountsPage extends BasePage {
  async navigate() {
    await this.goto("/accounts");
    await this.ensureAuthenticated();
    await this.waitForLoaded();
  }

  async openCreationForm() {
    let btn = this.page.getByTestId("accounts-create-account-btn");
    if ((await btn.count()) === 0) {
      btn = this.page.getByTestId("accounts-empty-create-btn");
    }
    await btn.click();
  }

  async fillForm(name: string, initialBalance: string) {
    await this.fillInput("account-name", name, 'input[formcontrolname="name"]');

    let balanceInput = this.page.getByTestId("account-initial-balance");
    if ((await balanceInput.count()) === 0) {
      balanceInput = this.page.locator("p-inputnumber input");
    }

    await balanceInput.click();
    await this.page.keyboard.type(initialBalance);
  }

  async submit() {
    await this.clickButton("submit-account-button", /salvar|criar/i);
  }

  async assertAccountInList(name: string) {
    const row = this.page.locator(`text=${name}`);
    await expect(row.first()).toBeVisible({ timeout: 10_000 });
  }
}
