import { test, expect } from "@playwright/test";
import { assertPageLoaded, assertToastMessage } from "../helpers/assertions";

test.describe("Fluxos de Contas (Accounts)", () => {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";

  test("deve criar uma nova conta e ela deve aparecer na lista", async ({
    page,
  }) => {
    // 1. Navegar para listagem de contas
    await page.goto(`${baseUrl}/accounts`);
    await assertPageLoaded(page);

    // 2. Clicar no botão para criar conta
    let criarContaBtn = page.getByTestId("accounts-create-account-btn");
    if ((await criarContaBtn.count()) === 0) {
      criarContaBtn = page.getByTestId("accounts-empty-create-btn");
    }
    await criarContaBtn.click();

    // 3. Preencher o formulário (Esperamos que exista um form ou dialog de conta)
    const timestamp = Date.now();
    const accountName = `Conta E2E ${timestamp}`;

    // Tenta test-ids do guia, com fallback
    let nameInput = page.getByTestId("account-name");
    if ((await nameInput.count()) === 0)
      nameInput = page.locator(
        'input[formcontrolname="name"], input[name="name"]',
      );
    await nameInput.waitFor({ state: "visible" });
    await nameInput.fill(accountName);

    let initialBalance = page.getByTestId("account-initial-balance");
    if ((await initialBalance.count()) === 0)
      initialBalance = page.locator(
        'input[formcontrolname="initialBalance"], input[name="initialBalance"], p-inputnumber input',
      );

    // As vezes o preenchimento de mask numerica ou currency exige click/type
    if ((await initialBalance.count()) > 0) {
      await initialBalance.first().click();
      await page.keyboard.type("50000"); // 500,00 reais dependendo da máscara
    }

    // Selecionar cor (opcional, pular se complexo na UI primeng e focar nos obrigatórios)

    // 4. Salvar
    let submitBtn = page.getByTestId("submit-account-button");
    if ((await submitBtn.count()) === 0) {
      submitBtn = page.getByRole("button", { name: /salvar|criar/i }).last();
    }
    await submitBtn.click();

    // 5. Validar feedback de sucesso (toast)
    // O toast de conta usa summary 'Conta criada'
    await assertToastMessage(page, /sucesso|criada/i);

    // 6. Validar que a conta aparece na lista
    // 6. Validar que a conta aparece na lista
    const accountRow = page.locator(`text=${accountName}`);
    await expect(accountRow.first()).toBeVisible({ timeout: 10_000 });
  });
});
