import { FullConfig, chromium } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function waitForUrl(url: string, timeoutMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // use global fetch available in Node 18+
      // eslint-disable-next-line no-undef
      const res = await (globalThis as any).fetch(url, { method: "GET" });
      if (res && res.ok) return true;
    } catch (e) {
      // ignore and retry
    }
    // wait 500ms
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  // 1) Esperar o frontend e backend estarem online
  const frontendHealth =
    process.env.E2E_FRONTEND_HEALTH_URL ?? "http://localhost:4200/";
  const backendHealth =
    process.env.E2E_BACKEND_HEALTH_URL ?? "http://127.0.0.1:3333/health";
  const frontendUp = await waitForUrl(frontendHealth, 60_000);
  const backendUp = await waitForUrl(backendHealth, 60_000);

  if (!frontendUp) {
    console.warn(
      `frontend não respondeu em ${frontendHealth} — inicie o app com npm run dev`,
    );
  }
  if (!backendUp) {
    console.warn(
      `backend não respondeu em ${backendHealth} — inicie o app com npm run dev`,
    );
  }

  // 2) Criar um arquivo storageState válido autenticando como usuário E2E
  const stateDir = path.resolve(__dirname, "state");
  const stateFile = path.join(stateDir, "auth.json");
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:4200";

  try {
    const email = "e2e@example.com";
    const password = "Dindinho#1234";

    await page.goto(`${baseUrl}/login`);

    // Tenta autenticar via UI usando locator flexível
    await page.waitForLoadState("networkidle");
    const emailLoc = page
      .locator(
        'input[type="email"], input[name="email"], [data-testid*="login-email-input"]',
      )
      .first();
    const passLoc = page
      .locator(
        'input[type="password"], input[name="password"], [data-testid*="login-password-input"] input',
      )
      .first();
    const submitLoc = page
      .locator(
        'button[type="submit"], [data-testid*="submit"], p-button button',
      )
      .first();

    if ((await emailLoc.count()) > 0 && (await passLoc.count()) > 0) {
      await emailLoc.fill(email);
      await passLoc.fill(password);
      await submitLoc.click();

      // Aguardar uma navegação bem sucedida após o login
      await page.waitForURL(/\/(dashboard|home|app)/, { timeout: 10_000 });
      await page.context().storageState({ path: stateFile });
      console.log("Login no backend/frontend bem sucedido via UI headless.");
    } else {
      console.warn(
        "Não foi possível encontrar inputs de login no frontend, criando auth state vazio.",
      );
      fs.writeFileSync(stateFile, JSON.stringify({ cookies: [], origins: [] }));
    }
  } catch (err) {
    console.warn(
      "Falha ao tentar logar e criar auth_state inicial, salvando estado vazio:",
      err,
    );
    fs.writeFileSync(stateFile, JSON.stringify({ cookies: [], origins: [] }));
  } finally {
    await browser.close();
  }
}
