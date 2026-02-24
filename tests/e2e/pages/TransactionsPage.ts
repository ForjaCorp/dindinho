import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class TransactionsPage extends BasePage {
  async navigateToNew() {
    await this.goto("/dashboard");
    await this.ensureAuthenticated();
    await this.waitForLoaded();
    await this.clickButton(
      "create-transaction-button",
      /nova transaç|adicionar/i,
    );
    await this.page.waitForURL("**/transactions/new*");
  }

  async handleAmountDrawer(amount: string) {
    const isDrawerAutoOpened = this.page.url().includes("openAmount");
    let amountInput = this.page.getByTestId("amount-sheet-input");

    if (isDrawerAutoOpened) {
      await amountInput.waitFor({ state: "visible" });
      await amountInput.fill(amount);
      await this.page.getByTestId("amount-sheet-confirm").click();
    } else {
      await this.clickButton("transaction-amount-trigger");
      await amountInput.waitFor({ state: "visible" });
      await amountInput.fill(amount);
      await this.page.getByTestId("amount-sheet-confirm").click();
    }
  }

  async fillDescription(desc: string) {
    await this.fillInput(
      "transaction-description",
      desc,
      'input[formcontrolname="description"]',
    );
  }

  async selectAccount(index: number = 1) {
    const selector = '[data-testid="transaction-account"]';
    // Espera até que uma opção válida (não o placeholder) esteja disponível
    await this.page.waitForSelector(
      `${selector} option:not([disabled]):not([value=""])`,
      { state: "attached", timeout: 10000 },
    );
    await this.page.selectOption(selector, { index });
  }

  async selectCategory(index: number = 1) {
    const selector = '[data-testid="transaction-category"]';
    await this.page.waitForSelector(
      `${selector} option:not([disabled]):not([value=""])`,
      { state: "attached", timeout: 10000 },
    );
    await this.page.selectOption(selector, { index });
  }

  async submit() {
    const submitBtn = this.page.getByTestId("transaction-submit-btn");
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/transactions") &&
          resp.request().method() === "POST",
      ),
      submitBtn.click(),
    ]);
  }

  async assertTransactionInList(desc: string) {
    await this.goto("/transactions");
    await this.page.waitForLoadState("networkidle");
    const row = this.page.locator(`text=${desc}`);
    await expect(row.first()).toBeVisible({ timeout: 10_000 });
  }
}
