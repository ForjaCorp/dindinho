# Guia de data-testid para E2E

Este guia documenta as convenções de `data-testid` usadas nos testes E2E e como adicionar ao frontend.

## Convenção de Nomes

Usar **kebab-case** prefixado com o contexto do componente:

- `login-email-input`
- `transaction-submit-button`
- `dashboard-balance-display`

## Componentes Críticos para Teste

### 1. **Autenticação (Login)**

```html
<!-- Page wrapper -->
<div data-testid="login-page">
  <!-- Form -->
  <form data-testid="login-form">
    <!-- Email input -->
    <input data-testid="login-email-input" />

    <!-- Password input -->
    <input data-testid="login-password-input" />

    <!-- Submit button -->
    <button data-testid="login-submit-button">
      <!-- Error message -->
      <div data-testid="login-error-message">
        <!-- Signup link -->
        <a data-testid="signup-link"></a>
      </div>
    </button>
  </form>
</div>
```

### 2. **Dashboard**

```html
<!-- Root component -->
<div data-testid="dashboard-root">
  <!-- Balance card -->
  <div data-testid="account-balance">
    <!-- Quick links -->
    <button data-testid="quick-link-accounts">
      <button data-testid="quick-link-cards">
        <button data-testid="quick-link-reports">
          <button data-testid="quick-link-invites">
            <!-- Transactions -->
            <div data-testid="dashboard-transactions-list">
              <div data-testid="dashboard-transaction-item-{id}">
                <div data-testid="dashboard-transactions-loading">
                  <div data-testid="dashboard-transactions-error">
                    <!-- Create account button -->
                    <button data-testid="create-account-button">
                      <!-- Create transaction button -->
                      <button data-testid="create-transaction-button">
                        <!-- App root -->
                        <div data-testid="app-root">
                          <!-- Logout button (em header/menu) -->
                          <button data-testid="logout-button"></button>
                        </div>
                      </button>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </button>
      </button>
    </button>
  </div>
</div>
```

### 3. **Transações**

```html
<!-- Page/Dialog -->
<div data-testid="transaction-form">
  <div data-testid="transactions-list">
    <!-- Form inputs -->
    <input data-testid="transaction-description" />
    <input data-testid="transaction-amount" />
    <select data-testid="transaction-category">
      <input data-testid="transaction-date" />

      <!-- Form buttons -->
      <button data-testid="transaction-submit">
        <button data-testid="transaction-save">
          <!-- List actions -->
          <button data-testid="transaction-edit">
            <button data-testid="transaction-delete">
              <div data-testid="transaction-row"></div>
            </button>
          </button>
        </button>
      </button>
    </select>
  </div>
</div>
```

### 4. **Contas (Accounts)**

```html
<!-- Create form -->
<form data-testid="account-form">
  <!-- Inputs -->
  <input data-testid="account-name" />
  <input data-testid="account-initial-balance" />
  <select data-testid="account-type">
    <!-- Buttons -->
    <button data-testid="account-submit">
      <button data-testid="account-save">
        <!-- List -->
        <div data-testid="accounts-list">
          <div data-testid="account-item-{id}">
            <button data-testid="account-edit-{id}">
              <button data-testid="account-delete-{id}">
                <button data-testid="account-share-{id}"></button>
              </button>
            </button>
          </div>
        </div>
      </button>
    </button>
  </select>
</form>
```

### 5. **Convites (Invites)**

```html
<!-- Page -->
<div data-testid="invites-page">
  <!-- Generate link -->
  <button data-testid="generate-invite-link">
    <input data-testid="invite-link" />
    <button data-testid="copy-invite-link">
      <!-- Active invites list -->
      <div data-testid="active-invites-list">
        <div data-testid="invite-item-{id}">
          <button data-testid="revoke-invite-{id}">
            <button data-testid="confirm-revoke">
              <!-- Received invites -->
              <div data-testid="received-invites-list">
                <button data-testid="accept-invite-{id}">
                  <button data-testid="reject-invite-{id}">
                    <!-- Shared account -->
                    <div data-testid="shared-account">
                      <!-- Navigation buttons -->
                      <button data-testid="invites-button"></button>
                    </div>
                  </button>
                </button>
              </div>
            </button>
          </button>
        </div>
      </div>
    </button>
  </button>
</div>
```

## Como Adicionar data-testid

### Exemplo 1: Input

```html
<input
  data-testid="login-email-input"
  type="email"
  placeholder="seu@email.com"
/>
```

### Exemplo 2: Button

```html
<button data-testid="submit-form-button" type="submit" (click)="onSubmit()">
  Enviar
</button>
```

### Exemplo 3: Dynamic IDs

```html
<button
  [attr.data-testid]="'transaction-edit-' + transaction.id"
  (click)="edit(transaction)"
>
  Editar
</button>
```

### Exemplo 4: Component (PrimeNG)

```html
<p-button
  data-testid="login-submit-button"
  type="submit"
  label="Entrar"
  [loading]="isLoading()"
/>
```

## Recomendações

1. **Adicione `data-testid` a todos os elementos interativos** (inputs, buttons, links).
2. **Use IDs dinâmicos** quando o elemento for parte de uma lista (`[attr.data-testid]`).
3. **Mantenha nomes consistentes** com a convenção kebab-case.
4. **Evite duplicatas**: cada `data-testid` deve ser único na página.
5. **Não use `data-testid` para styling** — use `class` ou Angular `host`.

## Verificação de Cobertura

Para verificar quais componentes ainda precisam de `data-testid`, execute:

```bash
npm run test:e2e -- --debug
```

Procure por:

- ❌ Locator not found
- ⚠️ Multiple locators found (duplicatas)

## Integração com Testes

Os helpers em `tests/e2e/helpers/` usam os seletores `data-testid`:

```typescript
// Em auth.ts
let emailLocator = page.getByTestId("login-email-input");

// Em assertions.ts
await assertTestIdVisible(page, "dashboard-root");
```

**Manter sincronizado**: sempre que adicionar um novo componente interativo, atualize esta documentação e o helper correspondente.
