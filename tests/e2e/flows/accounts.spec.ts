import { test } from "@playwright/test";
import { AccountsPage } from "../pages/AccountsPage";

test.describe("Fluxos de Contas (Accounts)", () => {
  test("deve criar uma nova conta e ela deve aparecer na lista", async ({
    page,
  }) => {
    const accountsPage = new AccountsPage(page);

    // 1. Navegar para listagem de contas
    await accountsPage.navigate();

    // 2. Abrir formulário de criação
    await accountsPage.openCreationForm();

    // 3. Preencher o formulário
    const timestamp = Date.now();
    const accountName = `Conta POM ${timestamp}`;
    await accountsPage.fillForm(accountName, "50000");

    // 4. Salvar
    await accountsPage.submit();

    // 5. Validar feedback e presença na lista
    await accountsPage.assertToast(/sucesso|criada/i);
    await accountsPage.assertAccountInList(accountName);
  });
});
