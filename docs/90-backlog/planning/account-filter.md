---
id: doc-account-filter
title: "Filtro por conta unificado (Relatórios + Transações)"
description: "Planejamento e execução do filtro unificado por conta (multi-select) em Relatórios e Transações."
audience: ["dev", "produto"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["filtros", "contas", "ux"]
mvp: true
createdAt: "2026-02-03"
updatedAt: "2026-02-03"
---

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

### Fase A1 — Contratos e serialização (CONCLUÍDO)

- [x] Padronizar o contrato de request:
  - [x] Preferencial: `accountIds: string[]` (multi) para ambas as páginas.
  - [x] Compatibilidade: aceitar `accountId: string` legado onde necessário.
- [x] Definir estratégia de serialização consistente no frontend:
  - [x] Enviar `accountIds` como array sempre (mesmo com 1 item), via repetição de chave (`accountIds=...&accountIds=...`) ou `accountIds[]`.
  - [x] Evitar enviar `accountIds` como string simples.
- [x] Tornar backend defensivo:
  - [x] Aceitar `accountIds` como `string | string[]` e normalizar para `string[]`.

Critério:

- [x] O caso “1 conta selecionada” funciona idêntico a “N contas selecionadas”.

### Fase A2 — Backend (CONCLUÍDO)

- Relatórios:
  - [x] Normalizar `accountIds` para array antes de montar `where.accountId in (...)`.
- Transações:
  - [x] Evoluir `GET /api/transactions` para aceitar `accountIds` (multi) além de `accountId` (single).
  - [x] Regra: se `accountIds` vier, tem precedência sobre `accountId`.

Arquivos-alvo:

- [reports.routes.ts](../../../backend/src/reports/reports.routes.ts)
- [reports.service.ts](../../../backend/src/reports/reports.service.ts)
- [transactions.routes.ts](../../../backend/src/transactions/transactions.routes.ts)
- [transactions.service.ts](../../../backend/src/transactions/transactions.service.ts)

### Fase A3 — Frontend (PARCIAL - Lógica implementada, componentização adiada)

- [x] Integrar em Relatórios e Transações, com sincronização por query params.
- [x] Implementar lógica de seleção múltipla (PrimeNG MultiSelect) diretamente nas páginas.
- [x] Preferir `accountIds` sempre; manter `accountId` apenas para compatibilidade de deep-link quando necessário.
- [ ] ~~Componentizar filtro por conta~~ (Adiado para Fase A5).

Arquivos-alvo:

- [reports.page.ts](../../../frontend/src/pages/reports/reports.page.ts)
- [transactions.page.ts](../../../frontend/src/pages/transactions/transactions.page.ts)

### Fase A4 — Testes e critérios de aceite (CONCLUÍDO)

- [x] Cobrir casos: vazio, 1 item, N itens; e persistência via query params.

Critérios:

- [x] UX de filtro por conta é a mesma em Relatórios e Transações.
- [x] Bug de “1 conta selecionada” deixa de existir.

### Fase A5 — Refatoração e Componentização (CONCLUÍDO)

Objetivo: Extrair a lógica duplicada de `ReportsPage` e `TransactionsPage` para um componente Angular reutilizável.

- [x] Criar componente `AccountFilterComponent` (`shared` ou `components`).
  - [x] Inputs: `selectedAccountIds` (Signal ou Input normal).
  - [x] Outputs: `selectionChange` (Emite array de strings).
  - [x] Lógica interna: Carregar contas via `AccountService`, gerenciar estado do `p-multiSelect`.
- [x] Refatorar `ReportsPage` para usar o novo componente.
- [x] Refatorar `TransactionsPage` para usar o novo componente.
- [x] Garantir que a sincronização com URL (query params) continue funcionando via página pai.
