# Documentação — backlog

## Objetivo

Manter documentação concisa, navegável e alinhada ao código, evitando duplicação e texto que envelhece.

## Escopo

- Cobrir fluxos críticos (setup, arquitetura, contratos, domínios principais).
- Evitar documentação de UI e checklists muito detalhados (preferir contratos e invariantes).

## Fases

### Fase D1 — Arquitetura do monorepo

- Mapear workspaces, scripts e como rodar local/CI.
- Padronizar links entre READMEs (root ↔ workspaces).

### Fase D2 — Contratos e validações (shared)

- Como schemas/DTOs são compartilhados (backend/frontend).
- Padrões de validação (query/body/response) e compatibilidade.
- Documentar contrato de respostas de erro HTTP e validação.
  - Contrato compartilhado: `ApiErrorResponseDTO` em `@dindinho/shared`.
  - Backend: error handler global retorna `{ statusCode, error, message }` e `issues` só em erro Zod.
  - Frontend: mapeamento prioriza `message` do backend e preserva detalhes técnicos.

### Fase D3 — Domínios do backend

- Auth (login/refresh/logout, tokens, allowlist, rate limiting).
- Accounts (tipos STANDARD/CREDIT, campos relevantes).
- Transactions (filtros, paginação, recorrência/parcelamento, invoiceMonth).
- Reports (endpoints, filtros e drill-down).
- Categories e Waitlist.

### Fase D4 — Persistência e operações

- Prisma: migrations, generate, deploy e ambientes.
- Seed e dados de desenvolvimento.
- Deploy: Coolify, docker-compose e healthchecks.

## Backlog de engenharia — contratos em runtime

### E1 — Envelope de erro consistente (backend)

- Definir envelope único para erros HTTP, incluindo `requestId` e `code` quando aplicável.
- Não vazar detalhes internos (stack/SQL) em ambientes não locais.

### E2 — Erros operacionais por domínio (backend)

- Padronizar erros de domínio com `statusCode` e `code` estáveis.
- Converter erros Prisma comuns para códigos de domínio.

### E3 — Parse defensivo de erro (frontend)

- Ao receber `HttpErrorResponse`, fazer parse defensivo do payload de erro para extrair `message`, `code`, `requestId` e `issues`.
- Manter fallback para formatos legados e erros de rede.

## Critérios de aceite

- Todo documento tem “por que existe” e links de entrada/saída.
- Nenhum fluxo crítico fica sem referência (setup/auth/transactions/reports/prisma).
- Documentos de ferramenta (ex.: regras de IA) apontam para uma única fonte.
