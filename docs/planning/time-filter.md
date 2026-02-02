# TimeFilter — Iteração de melhorias (Concluído)

## Contexto

A base do TimeFilter unificado (Relatórios + Transações) já está implementada, com duas “lentes”:

- Período (DAY_RANGE): presets e intervalo custom.
- Fatura (INVOICE_MONTH): seleção de competência `YYYY-MM`.

Esta iteração foca em polimento de UX, correções de consistência e endurecimento de contratos.

## Objetivo

- Reduzir ambiguidade do fluxo do editor (microcopy e foco).
- Garantir consistência de cálculos de período em qualquer timezone.
- Endurecer validações de contratos compartilhados.
- Evitar requests inválidos via guardrails de query params.

## Escopo

- Frontend: `TimeFilterComponent`, `ReportsPage`, `TransactionsPage`.
- Shared: schemas de `invoiceMonth` e `isoDay`.

Não-escopo:

- Alterar a regra de fallback do backend para `invoiceMonth`.
- Redesign visual amplo.

## Fases

### Fase M1 — UX e semântica do editor (TimeFilterComponent) [Concluído]

- [x] Renomear o botão Fechar → Concluir (mantendo o comportamento atual de aplicar ao sair).
- [x] Ajustar o título do sheet para refletir o modo ativo (Período / Fatura).
- [x] Tornar o backdrop não focável (evitar tab order estranho sem quebrar click/ESC).

Arquivos-alvo:

- [time-filter.component.ts](../../frontend/src/app/components/time-filter.component.ts)
- [time-filter.component.spec.ts](../../frontend/src/app/components/time-filter.component.spec.ts)

Critério:

- [x] Teclado: ESC fecha; foco inicial no botão Concluir; foco retorna ao botão de abertura.

### Fase M2 — Correção de timezone em heurísticas (Relatórios) [Concluído]

- [x] Corrigir `computeUtcDaysInclusive()` para não usar `getUTC*` em datas locais.
- [x] Garantir que a heurística `changeOnly` (ex.: range > 120 dias) não oscile por timezone.

Arquivos-alvo:

- [reports.page.ts](../../frontend/src/pages/reports/reports.page.ts)
- [reports.page.spec.ts](../../frontend/src/pages/reports/reports.page.spec.ts)

### Fase M3 — Contratos shared (validações e deduplicação) [Concluído]

- [x] Endurecer `invoiceMonthSchema` para validar mês 01–12.
- [x] Deduplicar `isoDaySchema` (single source of truth).
- [x] Atualizar specs para cobrir `invoiceMonth` fora da faixa (ex.: `2026-13`).

Arquivos-alvo:

- [transaction.schema.ts](../../packages/shared/src/schemas/transaction.schema.ts)
- [report.schema.ts](../../packages/shared/src/schemas/report.schema.ts)
- [report.schema.spec.ts](../../packages/shared/src/schemas/report.schema.spec.ts)
- [transaction.schema.spec.ts](../../packages/shared/src/schemas/transaction.schema.spec.ts)

### Fase M4 — Guardrails de query params (Transações) [Concluído]

- [x] Validar/clamp de `tzOffsetMinutes` no parser de query params para o range [-840, 840].
- [x] Evitar ativar filtro temporal quando os params estão inválidos (degradar para estado “sem filtro”).

Arquivos-alvo:

- [transactions.page.ts](../../frontend/src/pages/transactions/transactions.page.ts)
- [transactions.page.spec.ts](../../frontend/src/pages/transactions/transactions.page.spec.ts)

## Critérios de aceite

- [x] Texto Concluir deixa claro que fechar aplica mudanças.
- [x] Backdrop não recebe foco via Tab/Shift+Tab; ESC continua funcionando.
- [x] `changeOnly` não muda comportamento por timezone.
- [x] `invoiceMonth` inválido (ex.: `2026-13`) é rejeitado no shared.
- [x] Existe um único `isoDaySchema` no shared.
- [x] `tzOffsetMinutes` inválido não gera request inválido nem quebra a listagem.
- [x] Testes unitários cobrindo os pontos acima.
