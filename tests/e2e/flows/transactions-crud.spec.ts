import { test, expect } from "@playwright/test";
import { assertPageLoaded, assertToastMessage } from "../helpers/assertions";

test.describe("Fluxo de Ciclo de Vida de Transações", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";

  test("deve criar uma nova transação e refletir na listagem de extrato", async ({
    page,
  }) => {
    // 1. Navegar para a página inicial
    await page.goto(`${baseUrl}/dashboard`);
    await assertPageLoaded(page);

    // 2. Procurar o botão de criar transação rápida
    let createTxBtn = page.getByTestId("create-transaction-button");
    if ((await createTxBtn.count()) === 0) {
      createTxBtn = page
        .getByRole("button", { name: /nova transaç|adicionar/i })
        .first();
    }
    await createTxBtn.click();

    // Em alguns casos pode abrir um modal, noutros roudear para /transactions/new
    // Garante que o form renderizou
    const timestamp = Date.now();
    const desc = `E2E Tx ${timestamp}`;

    // Wait for navigation and determine if drawer Auto-opened
    await page.waitForURL("**/transactions/new*");
    const isDrawerAutoOpened = page.url().includes("openAmount");
    let amountInput = page.getByTestId("amount-sheet-input");

    if (isDrawerAutoOpened) {
      await amountInput.waitFor({ state: "visible" });
      await amountInput.fill("150");
      await page.getByTestId("amount-sheet-confirm").click();
    }

    // Description
    let descInput = page.getByTestId("transaction-description");
    if ((await descInput.count()) === 0)
      descInput = page.locator(
        'input[formcontrolname="description"], input[name="description"]',
      );
    await descInput.waitFor({ state: "visible" });
    await descInput.fill(desc);

    if (!isDrawerAutoOpened) {
      // Amount usa um Drawer complexo, o botão que abre o amount input é o "transaction-amount-trigger"
      let amountTrigger = page.getByTestId("transaction-amount-trigger");
      await amountTrigger.click();
      await amountInput.waitFor({ state: "visible" });
      await amountInput.fill("150");
      // Confirmar o drawer
      await page.getByTestId("amount-sheet-confirm").click();
    }

    // A data/category/type/status costs too much variance across libs depending on their Dropdowns
    // Wait for the options to be loaded
    await page
      .locator('select[data-testid="transaction-account"] option:nth-child(2)')
      .waitFor({ state: "attached" });
    await page.getByTestId("transaction-account").selectOption({ index: 1 });

    await page
      .locator('select[data-testid="transaction-category"] option:nth-child(2)')
      .waitFor({ state: "attached" });
    await page.getByTestId("transaction-category").selectOption({ index: 1 });

    let submitBtn = page.getByTestId("transaction-submit-btn");
    if ((await submitBtn.count()) === 0) {
      submitBtn = page.getByRole("button", { name: /salvar|criar/i }).last();
    }

    // Clicar para salvar
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/transactions") &&
          resp.request().method() === "POST",
      ),
      submitBtn.click(),
    ]);

    // 4. Validar o feedback do sistema
    await assertToastMessage(page, /sucesso|criada/i);

    // 5. Navegar para transações (extrato) e validar na lista
    await page.goto(`${baseUrl}/transactions`);
    await page.waitForLoadState("networkidle");
    const txRow = page.locator(`text=${desc}`);
    await expect(txRow.first()).toBeVisible({ timeout: 10_000 });
  });
});
