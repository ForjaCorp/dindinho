# Filtro por conta unificado (Relatórios + Transações)

## Contexto

- Em Relatórios, o filtro por conta é multi-select com chips e está acoplado à página.
- Em Transações, o filtro por conta é single-select e a UX fica inconsistente.
- Existe um bug reportado: ao selecionar apenas 1 conta no multi-select, o filtro não funciona.

Hipótese mais provável do bug:

- Serialização de query params de array: com 1 item, o parâmetro pode chegar como `string` ao invés de `string[]` (ex.: `accountIds=uuid`).

## Objetivo

- Definir contrato único para filtro por conta.
- Garantir consistência entre páginas.
- Eliminar o bug do caso “1 conta selecionada”.

## Fases

### Fase A1 — Contratos e serialização

- Padronizar o contrato de request:
  - Preferencial: `accountIds: string[]` (multi) para ambas as páginas.
  - Compatibilidade: aceitar `accountId: string` legado onde necessário.
- Definir estratégia de serialização consistente no frontend:
  - Enviar `accountIds` como array sempre (mesmo com 1 item), via repetição de chave (`accountIds=...&accountIds=...`) ou `accountIds[]`.
  - Evitar enviar `accountIds` como string simples.
- Tornar backend defensivo:
  - Aceitar `accountIds` como `string | string[]` e normalizar para `string[]`.

Critério:

- O caso “1 conta selecionada” funciona idêntico a “N contas selecionadas”.

### Fase A2 — Backend

- Relatórios:
  - Normalizar `accountIds` para array antes de montar `where.accountId in (...)`.
- Transações:
  - Evoluir `GET /api/transactions` para aceitar `accountIds` (multi) além de `accountId` (single).
  - Regra: se `accountIds` vier, tem precedência sobre `accountId`.

Arquivos-alvo:

- [reports.routes.ts](../../backend/src/reports/reports.routes.ts)
- [reports.service.ts](../../backend/src/reports/reports.service.ts)
- [transactions.routes.ts](../../backend/src/transactions/transactions.routes.ts)
- [transactions.service.ts](../../backend/src/transactions/transactions.service.ts)

### Fase A3 — Frontend

- Componentizar filtro por conta com seleção configurável (single/multi) e visual consistente.
- Integrar em Relatórios e Transações, com sincronização por query params.
- Preferir `accountIds` sempre; manter `accountId` apenas para compatibilidade de deep-link quando necessário.

Arquivos-alvo:

- [reports.page.ts](../../frontend/src/pages/reports/reports.page.ts)
- [transactions.page.ts](../../frontend/src/pages/transactions/transactions.page.ts)

### Fase A4 — Testes e critérios de aceite

- Cobrir casos: vazio, 1 item, N itens; e persistência via query params.

Critérios:

- UX de filtro por conta é a mesma em Relatórios e Transações.
- Bug de “1 conta selecionada” deixa de existir.
