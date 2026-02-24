import { test } from "@playwright/test";
import { TransactionsPage } from "./pages/TransactionsPage";
import { DashboardPage } from "./pages/DashboardPage";

test.describe("Fluxo de Transações", () => {
  test("página de transações carrega", async ({ page }) => {
    const transactionsPage = new TransactionsPage(page);
    await transactionsPage.goto("/transactions");
    await transactionsPage.ensureAuthenticated();
    await transactionsPage.waitForLoaded();
  });

  test("página de criar transação carrega", async ({ page }) => {
    const transactionsPage = new TransactionsPage(page);
    await transactionsPage.goto("/transactions/new");
    await transactionsPage.ensureAuthenticated();
    await transactionsPage.waitForLoaded();
  });

  test("saldo é exibido no dashboard", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
    await dashboardPage.assertBalanceVisible();
  });
});
