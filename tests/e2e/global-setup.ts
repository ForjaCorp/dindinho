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
    await new Promise((r) => setTimeout(r, 1000));
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
    // Aguarda o container frontend estar respondendo HTTP primeiro
    console.log(`Aguardando frontend em ${baseUrl}...`);
    const appReady = await waitForUrl(baseUrl, 120_000);
    if (!appReady) {
      console.error("Frontend não subiu a tempo.");
      return;
    }

    await page.goto(`${baseUrl}/login`);

    // Tenta autenticar via UI usando locator flexível
    console.log(
      "Aguardando carregamento da página de login e hidratação do Angular...",
    );
    await page.waitForSelector(
      '[data-testid="login-email-input"], input#email, input[type="email"]',
      { state: "visible", timeout: 60_000 },
    );
    await page.waitForLoadState("networkidle");
    const emailLoc = page
      .locator(
        '[data-testid="login-email-input"], input#email, input[type="email"]',
      )
      .first();
    const passLoc = page
      .locator(
        '[data-testid="login-password-input"] input, input#password, input[type="password"]',
      )
      .first();
    const submitLoc = page
      .locator(
        '[data-testid="login-submit-button"], button[type="submit"], button:has-text("entrar"), button:has-text("login")',
      )
      .first();

    if ((await emailLoc.count()) > 0 && (await passLoc.count()) > 0) {
      await emailLoc.fill(email);
      await passLoc.fill(password);
      await submitLoc.click();

      // Aguardar uma navegação bem sucedida após o login
      console.log("Aguardando redirecionamento pós-login...");
      await page.waitForURL(/\/(dashboard|home|app)/, { timeout: 20_000 });
      await page.context().storageState({ path: stateFile });
      console.log(
        "Login no backend/frontend bem sucedido via UI headless. Auth state salvo.",
      );
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
