import { BasePage } from "./BasePage";

export class InvitesPage extends BasePage {
  async navigate() {
    await this.goto("/invites");
    await this.ensureAuthenticated();
    await this.waitForLoaded();
  }
}
