# Testes E2E (End-to-End) - Dindinho

Guia completo para execução, desenvolvimento e integração contínua de testes E2E usando **Playwright**.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Configuração Local](#configuração-local)
- [Executar Testes](#executar-testes)
- [Estrutura de Testes](#estrutura-de-testes)
- [Helpers e Utilities](#helpers-e-utilities)
- [Boas Práticas](#boas-práticas)
- [CI/CD Integration](#cicd-integration)

## Visão Geral

Os testes E2E validam fluxos críticos do Dindinho de ponta a ponta:

- ✅ **Autenticação** (registro, login, logout, persistência de sessão)
- ✅ **Transações** (criar, editar, deletar, atualizar saldo em tempo real)
- ✅ **Contas** (criar, editar, deletar, transferências)
- ✅ **Convites** (gerar link, aceitar, rejeitar, revogar, colaboração)

### Tech Stack

| Tecnologia              | Uso                                                 |
| ----------------------- | --------------------------------------------------- |
| **Playwright Test**     | Test runner E2E                                     |
| **Docker Compose**      | Infraestrutura efêmera (MySQL + Backend + Frontend) |
| **Prisma**              | Migrações de BD para testes                         |
| **TypeScript (strict)** | Zero `any`, máxima segurança de tipos               |

## Arquitetura

```
tests/e2e/
├── global-setup.ts              # Setup antes de todos os testes
├── smoke.spec.ts                # Testes básicos (sanidade)
├── auth.spec.ts                 # Fluxos de autenticação
├── transactions.spec.ts         # CRUD de transações
├── invites.spec.ts              # Sistema de convites
├── helpers/
│   ├── auth.ts                  # Helpers de login, setup de usuário
│   ├── fixtures.ts              # Dados/factories para testes
│   └── assertions.ts            # Custom matchers
├── state/
│   └── auth.json                # StorageState para sessão (gerado)
├── DATA_TESTID_GUIDE.md         # Guia de data-testid
└── README.md                    # Este arquivo

playwright.config.ts             # Config do Playwright
docker-compose.test.yml         # Stack efêmero para testes
```

## Configuração Local

### Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- npm 11+

### Instalar dependências

```bash
npm install
```

Isso vai instalar `@playwright/test` e todas as dependências do monorepo.

### Verificar setup

```bash
npm run test:e2e -- --version
```

## Executar Testes

### Todos os testes

```bash
npm run test:e2e
```

O script vai:

1. Subir stack efêmero (`mysql`, `backend`, `frontend`)
2. Aplicar migrações Prisma
3. Rodar Playwright
4. Gerar relatório HTML em `playwright-report/`
5. Parar containers

### Modo CI (sem HTML interativo)

```bash
npm run test:e2e:ci
```

Usa reporter simples (dot) e sem HTML artifacts interativos.

### Rodar teste específico

```bash
npx playwright test --config=playwright.config.ts tests/e2e/auth.spec.ts
```

### Modo debug/watch

```bash
npx playwright test --config=playwright.config.ts --debug
```

Abre o Playwright Inspector para depuração interativa.

### Ver relatório HTML

```bash
npx playwright show-report
```

Abre o relatório em navegador.

## Estrutura de Testes

### 1. Smoke Test (`smoke.spec.ts`)

Valida que a aplicação carrega corretamente:

- ✅ Frontend responde em `http://localhost:4200`
- ✅ Page inicial tem conteúdo não-vazio
- ✅ Login via UI funciona

**Quando executar**: sempre, como primeiro check (rápido ~30s).

### 2. Auth Tests (`auth.spec.ts`)

Fluxos de autenticação:

- ✅ Registrar e fazer login
- ✅ Login com credenciais inválidas
- ✅ Sessão persiste após reload

**Setup**: cria usuário via API-first (ou fallback com credenciais padrão).

### 3. Transaction Tests (`transactions.spec.ts`)

CRUD de transações:

- ✅ Criar nova transação
- ✅ Editar transação existente
- ✅ Deletar transação
- ✅ Saldo atualiza em tempo real

**Setup**: cria usuário + faz login antes de cada teste.

### 4. Invite Tests (`invites.spec.ts`)

Sistema de convites e colaboração:

- ✅ Gerar link de convite
- ✅ Aceitar convite (novo usuário)
- ✅ Listar e revogar convites ativos

**Setup**: cria 2-3 usuários (inviter, invitee).

## Helpers e Utilities

### `auth.ts` — Autenticação

```typescript
// Criar usuário via API-first setup
const user = await createTestUser(apiUrl, email, password);

// Fazer login via UI
await loginViaUI(page, email, password, baseUrl);

// Capturar estado de autenticação para reutilização
await captureAuthState(page, filePath);
```

### `fixtures.ts` — Dados de Teste

```typescript
import { testUser, testTransaction, testAccount } from "./helpers/fixtures";

// Usar em testes
const user = testUser; // { email: 'e2e@example.com', password: '...' }
const txn = testTransaction; // { description, amount, category, date }
const acc = testAccount; // { name, initialBalance }
```

### `assertions.ts` — Custom Matchers

```typescript
import {
  assertPageLoaded,
  assertTestIdVisible,
  assertToastMessage,
} from "./helpers/assertions";

// Validar que elemento está visível
await assertTestIdVisible(page, "dashboard-root");

// Validar que página carregou
await assertPageLoaded(page);

// Validar toast/alerta
await assertToastMessage(page, "Transação criada com sucesso");
```

## Boas Práticas

### 1. Use `data-testid` para Seleção

✅ **Bom**

```typescript
const email = page.getByTestId("login-email-input");
```

❌ **Ruim**

```typescript
const email = page.locator('input[type="email"]'); // Frágil
```

**Guia**: ver [DATA_TESTID_GUIDE.md](./DATA_TESTID_GUIDE.md)

### 2. Sempre use `await`

✅ **Bom**

```typescript
await page.goto("/");
await expect(element).toBeVisible();
```

❌ **Ruim**

```typescript
page.goto("/"); // Sem await
```

### 3. Nomeie testes em Português (Contexto do projeto)

✅ **Bom**

```typescript
test('usuário pode fazer login com credenciais válidas', async ({ page }) => {
```

### 4. Use `test.beforeEach` para Setup Comum

✅ **Bom**

```typescript
test.beforeEach(async ({ page }) => {
  const user = await createTestUser(apiUrl, email, password);
  await loginViaUI(page, email, password, baseUrl);
});

test("criar transação", async ({ page }) => {
  // já está logado
});
```

### 5. Zero `any` — Use TypeScript Strict

✅ **Bom**

```typescript
const res = await (globalThis as any).fetch(url); // Type-safe cast
if (res && res.ok) {
  const data = (await res.json()) as { id?: string };
}
```

❌ **Ruim**

```typescript
const data: any = await res.json(); // Não faça isso
```

### 6. Use Fallbacks para Seletores

```typescript
let element = page.getByTestId("element-id");
if ((await element.count()) === 0) {
  element = page.locator("CSS selector aqui");
}
```

### 7. Aguarde Estados de Rede

```typescript
await page.waitForLoadState("networkidle");
// ou
await page.waitForLoadState("domcontentloaded");
```

### 8. Reutilize StorageState para Performance

O `global-setup.ts` salva sessão em `tests/e2e/state/auth.json`. Testes subsequentes reutilizam isso — sem fazer login novamente.

## CI/CD Integration

### GitHub Actions (Exemplo)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm install
      - run: npm run test:e2e:ci

      - name: Upload Traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results/e2e/

      - name: Publish Report
        if: always()
        uses: daun/playwright-report-action@v3
```

### Environment Variables

Configure no CI (ou `.env.test`):

```env
E2E_BASE_URL=http://localhost:4200
E2E_API_URL=http://localhost:3000
E2E_BACKEND_HEALTH_URL=http://localhost:3000/health
E2E_FRONTEND_HEALTH_URL=http://localhost:4200/health
```

## Troubleshooting

### ❌ `page.goto: net::ERR_CONNECTION_REFUSED`

Significa que frontend/backend não respondeu. Verifique:

```bash
# Verify containers are running
docker ps

# Check backend health
curl http://localhost:3000/health

# Check frontend is serving
curl http://localhost:4200/
```

### ❌ `Timeout waiting for locator`

Significa que elemento não existe. Debug:

```bash
npx playwright test --debug
# No Inspector, rode:
# page.getByTestId('seu-elemento')
```

### ❌ `Test timeout of 60000ms exceeded`

Algum comando está demorando demais. Causas comuns:

- ❌ Elementos demorando para carregar → aumentar timeout
- ❌ Rede lenta → usar `waitForLoadState('networkidle')`
- ❌ Elemento não existe → usar fallback de seletor

### ✅ Limpar tudo

```bash
docker compose -f docker-compose.test.yml down -v
rm -rf test-results/ playwright-report/
rm tests/e2e/state/auth.json
```

## Próximos Passos

1. **Adicionar mais testes**: Reports, Dashboard avançado, etc.
2. **Performance**: Rodar testes em paralelo com Playwright workers.
3. **Visual Testing**: Adicionar comparação de screenshots com Percy/Chromatic.
4. **Load Testing**: Integrar k6 para performance bajo carga.
5. **Monitoring**: Integrar testes ao Datadog ou NewRelic.

## Recursos

- [Playwright Docs](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Dindinho CODING_STANDARDS.md](../../CODING_STANDARDS.md)
- [Plano de Testes E2E](../../docs/90-planejamento/em-andamento/plano-testes-e2e.md)

---

**Last Updated**: Feb 10, 2026
**Maintainers**: Engineering Team
