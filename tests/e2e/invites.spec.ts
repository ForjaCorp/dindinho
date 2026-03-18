import { test } from "@playwright/test";
import { InvitesPage } from "./pages/InvitesPage";

test.describe("Fluxo de Convites", () => {
  test("página de convites carrega e tem conteúdo", async ({ page }) => {
    const invitesPage = new InvitesPage(page);
    await invitesPage.navigate();
    await invitesPage.waitForLoaded();
  });
});
