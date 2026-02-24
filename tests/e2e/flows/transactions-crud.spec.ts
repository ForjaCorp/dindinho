import { test } from "@playwright/test";
import { TransactionsPage } from "../pages/TransactionsPage";

test.describe("Fluxo de Ciclo de Vida de Transações", () => {
  test("deve criar uma nova transação e refletir na listagem de extrato", async ({
    page,
  }) => {
    const transactionsPage = new TransactionsPage(page);

    // 1. Navegar para criação de transação
    await transactionsPage.navigateToNew();

    // 2. Preencher dados
    const timestamp = Date.now();
    const desc = `Tx POM ${timestamp}`;

    await transactionsPage.handleAmountDrawer("150");
    await transactionsPage.fillDescription(desc);
    await transactionsPage.selectAccount(1);
    await transactionsPage.selectCategory(1);

    // 3. Salvar
    await transactionsPage.submit();

    // 4. Validar feedback e presença na lista
    await transactionsPage.assertToast(/sucesso|criada/i);
    await transactionsPage.assertTransactionInList(desc);
  });
});
