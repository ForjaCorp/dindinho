---
id: doc-planning-execution
title: "Documentação — plano de execução (portal + contratos + API)"
description: "Plano de execução para criar um portal de documentação, gerar referência de API via OpenAPI e manter contratos de dados consistentes."
audience: ["dev", "ops", "product"]
visibility: "internal"
status: "wip"
owners: ["engineering"]
tags: ["documentation", "planning", "openapi", "contracts"]
mvp: true
createdAt: "2026-02-02"
---

# Documentação — plano de execução (portal + contratos + API)

## Contexto atual

- Monorepo com `backend` (Fastify + Prisma), `frontend` (Angular PWA), `packages/shared` (Zod)
- Deploy via containers Docker e Coolify (`docker-compose.coolify.yml`)
- Padrão atual no backend: schemas Zod em `schema.body/querystring/response` e `ZodTypeProvider`

## Objetivo

Manter documentação concisa, navegável e alinhada ao código, evitando duplicação e texto que envelhece.

## Resultado esperado (artefatos)

- Portal de documentação com navegação e busca
- Referência de API gerada (OpenAPI) a partir do backend
- Contratos compartilhados e versionáveis em `@dindinho/shared` (Zod)
- Governança: regras mínimas para manter docs atualizadas conforme o produto cresce

## Princípios

- Contrato antes de texto: Zod/OpenAPI como fonte de verdade; docs explicam invariantes e trade-offs
- Um assunto, uma fonte: sempre preferir links a duplicação
- Dois modos de consumo: interno (engenharia/ops) e público (usuário/produto)
- Compatibilidade explícita: mudanças em contrato seguem semver do pacote `@dindinho/shared`

## Arquitetura de 3 Tiers de Documentação (Implementada)

A documentação do Dindinho é estruturada em três camadas de acesso, garantindo que cada público veja apenas o conteúdo relevante e seguro para seu perfil. A implementação utiliza **Angular Standalone Components**, **Signals** e **Role-Based Access Control (RBAC)**.

### 1. Nível Público (Guest)

- **Público:** Visitantes não autenticados.
- **Layout:** `GuestDocsLayoutComponent` (Tema Slate/Neutral).
- **Conteúdo:** Visão geral do produto, FAQ, Planos/Pricing, Termos de Uso.
- **Acesso:** Rotas abertas via `docs/public/*`.
- **Exemplo:** [FAQ](file:///home/vinicius/dev/dindinho/docs/00-overview/faq.md).

### 2. Nível Usuário (Authenticated)

- **Público:** Usuários logados (clientes).
- **Layout:** `UserDocsLayoutComponent` (Tema Emerald/Finance).
- **Conteúdo:** Guia de uso das funcionalidades, tutoriais de conciliação, relatórios.
- **Acesso:** Protegido por `authGuard`. Rotas em `docs/user/*`.
- **Exemplo:** [Guia de Relatórios](file:///home/vinicius/dev/dindinho/docs/40-clients/pwa/reports-frontend.md).

### 3. Nível Admin/Engenharia (Internal/Privileged)

- **Público:** Desenvolvedores e Administradores.
- **Layout:** `AdminDocsLayoutComponent` (Tema Indigo/Tech).
- **Conteúdo:** Arquitetura técnica, ADRs, Infraestrutura e **Swagger UI**.
- **Acesso:** Requer role `ADMIN`. Rotas em `docs/admin/*`.
- **Exemplo:** [Evolução de Rotas](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/ROUTING_EVOLUTION_PLAN.md).

---

## Implementação Técnica

### Roteamento e Slugs

O sistema utiliza um mapeamento de `slugs` para caminhos físicos no diretório `docs/`. Isso permite URLs amigáveis como `/docs/admin/api-ref` que apontam para arquivos complexos como `30-api/openapi.json`.

- **DocsPage:** Componente central que consome `slug` da URL.
- **Frontmatter:** Parsing automático de `title`, `description` e `tags` via regex no frontend.
- **Swagger Integration:** Redirecionamento seguro para a UI interativa do Swagger apenas para administradores.

### DocsService

O `DocsService` centraliza o carregamento de assets (Markdown e JSON). Ele implementa um mecanismo de fallback: tenta carregar a especificação OpenAPI viva do backend e, em caso de falha, utiliza o arquivo empacotado nos assets do frontend.

## Escopo

- Cobrir fluxos críticos (setup, arquitetura, contratos, domínios principais, operações)
- Organizar backlog e decisões (ADRs)
- Evitar documentação de UI e checklists muito detalhados (preferir contratos, invariantes e fluxos)

## Taxonomia de informação (estrutura de docs)

Recomendação de estrutura em `docs/`:

- `00-overview/`: visão geral, glossário, princípios
- `10-product/`: regras de negócio, MVP, pricing/planos (quando existir)
- `20-architecture/`: visão técnica e integrações
- `21-adr/`: decisões numeradas (ADRs)
- `30-api/`: autenticação, convenções, erros, exemplos, embed do OpenAPI
- `40-clients/`: PWA (Angular) e futuro app nativo (iOS/Android)
- `50-ops/`: prisma/migrations, deploy (Coolify), healthchecks, jobs
- `90-backlog/`: épicos, RFCs curtas e itens em descoberta

## Contratos (data contracts)

### Contrato de erro (já existente)

- Fonte: `packages/shared/src/schemas/error.schema.ts`
- Envelope alvo: `ApiErrorResponseDTO`

### Contrato de metadados de docs (frontmatter)

Objetivo: classificar docs por público/maturidade e permitir validação automática.

Proposta (novo schema em `@dindinho/shared`):

```ts
import { z } from "zod";

export const docAudienceSchema = z.enum([
  "dev",
  "ops",
  "product",
  "user",
  "admin",
]);
export type DocAudienceDTO = z.infer<typeof docAudienceSchema>;

export const docVisibilitySchema = z.enum(["internal", "public", "private"]);
export type DocVisibilityDTO = z.infer<typeof docVisibilitySchema>;

export const docStatusSchema = z.enum(["draft", "wip", "stable", "deprecated"]);
export type DocStatusDTO = z.infer<typeof docStatusSchema>;

export const docFrontmatterSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(3),
  description: z.string().max(280).optional(),

  audience: z.array(docAudienceSchema).min(1),
  visibility: docVisibilitySchema.default("internal"),
  status: docStatusSchema.default("draft"),

  owners: z.array(z.string().min(2)).min(1),
  tags: z.array(z.string().min(2)).default([]),

  mvp: z.boolean().default(false),

  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  links: z
    .object({
      repoPaths: z.array(z.string()).default([]),
      relatedDocs: z.array(z.string()).default([]),
      endpoints: z.array(z.string()).default([]),
    })
    .default({ repoPaths: [], relatedDocs: [], endpoints: [] }),
});
export type DocFrontmatterDTO = z.infer<typeof docFrontmatterSchema>;
```

### Contrato de backlog (opcional, mas recomendado)

Objetivo: organizar backlog em um formato que pode virar board/relatório sem reescrever tudo.

Proposta (novo schema em `@dindinho/shared`):

```ts
import { z } from "zod";

export const backlogTypeSchema = z.enum(["epic", "story", "spike", "rfc"]);
export type BacklogTypeDTO = z.infer<typeof backlogTypeSchema>;

export const backlogStatusSchema = z.enum([
  "idea",
  "discovery",
  "planned",
  "in_progress",
  "done",
  "dropped",
]);
export type BacklogStatusDTO = z.infer<typeof backlogStatusSchema>;

export const backlogPrioritySchema = z.enum(["p0", "p1", "p2", "p3"]);
export type BacklogPriorityDTO = z.infer<typeof backlogPrioritySchema>;

export const backlogItemSchema = z.object({
  id: z.string().min(3),
  type: backlogTypeSchema,
  title: z.string().min(3),

  problem: z.string().min(10),
  constraints: z.array(z.string().min(3)).default([]),
  acceptance: z.array(z.string().min(3)).default([]),

  status: backlogStatusSchema.default("idea"),
  priority: backlogPrioritySchema.default("p2"),
  mvp: z.boolean().default(false),

  owners: z.array(z.string().min(2)).min(1),
  dependencies: z.array(z.string().min(3)).default([]),

  links: z
    .object({
      docs: z.array(z.string()).default([]),
      issues: z.array(z.string()).default([]),
      pullRequests: z.array(z.string()).default([]),
    })
    .default({ docs: [], issues: [], pullRequests: [] }),
});
export type BacklogItemDTO = z.infer<typeof backlogItemSchema>;
```

## OpenAPI (fonte de verdade para clientes externos)

### Decisão

- O backend já define `schema` (body/query/response) com Zod.
- O plano é derivar OpenAPI a partir dessas definições para atender:
  - PWA (Angular)
  - Futuro app nativo (clientes não TypeScript)
  - Suporte/QA e integrações

### Saída

- `openapi.json` gerado por script no backend
- Renderização no portal de docs

## Plano em fases (pequenas e incrementais)

### Fase D0 — Inventário e pontos de entrada (1 PR) (CONCLUÍDO)

- [x] Consolidar links entre `README.md` (root), `backend/README.md`, `frontend/README.md` e `docs/`
- [x] Definir a árvore alvo do `docs/` (taxonomia) e mover documentos existentes sem perder links
- [x] Definir o que será público vs interno (visibilidade)

Critério de aceite:

- [x] Qualquer pessoa consegue: rodar local, entender MVP e achar Auth/Reports/Transactions

### Fase D1 — Padrões de contrato e compatibilidade (1 PR) (CONCLUÍDO)

- [x] Formalizar e estabilizar o envelope de erro (`ApiErrorResponseDTO`) como contrato central
- [x] Definir guideline de versionamento do `@dindinho/shared` para mudanças incompatíveis
- [x] Formalizar convenções de validação:
  - [x] `body/querystring/params/response` sempre em Zod
  - [x] coerções (`z.coerce`) e `.transform` devem ser previsíveis

Critério de aceite:

- [x] Uma página em `docs/30-api/` referencia o contrato de erro e validações

### Fase D2 — Metadados de docs e backlog estruturado (1 PR) (CONCLUÍDO)

- [x] Adicionar `docFrontmatterSchema` e `backlogItemSchema` ao `@dindinho/shared`
- [x] Definir convenção de frontmatter para cada doc planejado

Critério de aceite:

- [x] Todo doc novo tem `id/title/owners/status/visibility/audience`

### Fase D3 — Geração de OpenAPI (2 PRs) (CONCLUÍDO)

PR A (infra):

- [x] Adicionar plugin Swagger ao backend
- [x] Configurar transformação Zod → JSON Schema para Swagger
- [x] Expor rota interna de spec (ex.: `/internal/openapi.json`) ou gerar arquivo em build

PR B (governança):

- [x] Padronizar `summary/tags` em todas as rotas
- [x] Padronizar respostas de erro por status (401/403/404/409/422)

Critério de aceite:

- [x] Spec gera sem erros e cobre rotas principais (auth/accounts/transactions/reports)

### Fase D4 — Portal de docs (3 PRs)

PR A (skeleton):

- [x] Criar um app de docs no monorepo (site estático)
- [x] Integrar conteúdo de `docs/` como fonte

PR B (API):

- [x] Renderizar `openapi.json` dentro do portal

PR C (qualidade):

- [x] Checagem de links internos
- [x] Validação de frontmatter com Zod

Critério de aceite:

- [x] Portal roda localmente e a navegação cobre os fluxos críticos

### Fase D5 — Deploy no Coolify (1 PR)

- [x] Adicionar um serviço `docs` no `docker-compose.coolify.yml` ou incorporar ao container do frontend como rota `/docs`
- [x] Definir variáveis/URLs e healthcheck do serviço de docs

Notas de deploy (subdomínio + proxy):

- O portal de docs será exposto via subdomínio: `https://docs.dindinho.forjacorp.com/`
- No Coolify, a forma recomendada é manter `/api` funcionando no subdomínio via reverse proxy (ex.: Nginx no container do frontend) apontando para o backend interno.
- DNS: criar `docs.dindinho.forjacorp.com` (CNAME para o host do app, ou A/AAAA para o servidor) e adicionar esse domínio ao serviço `docs`.
- CORS do backend: `FRONTEND_URL` deve incluir ambos os origins (ex.: `https://dindinho.forjacorp.com,https://docs.dindinho.forjacorp.com`).

Critério de aceite:

- [x] Portal disponível em produção no subdomínio `https://docs.dindinho.forjacorp.com/`

### Fase D6 — Separação em 3 Tiers (Público, Usuário, Admin) (1 PR) (CONCLUÍDO)

- [x] Implementar Layout Público e Rotas Desprotegidas (FAQ, Pricing).
- [x] Implementar Layout de Documentação de Usuário (Protegido por Auth).
- [x] Implementar Portal/Seção Admin (Restrito a roles administrativas).
- [x] Configurar visibilidade condicional do Swagger (apenas em Dev ou para Admins em Prod).
- [x] Validar frontmatter das docs existentes para garantir `visibility` e `audience` corretos.

Critério de aceite:

- [x] Usuários anônimos acessam apenas conteúdo público (Guest).
- [x] Usuários logados acessam guias de uso (Authenticated) sem ver detalhes de infra/ADRs.
- [x] Detalhes de infra e OpenAPI completo são restritos ao tier Admin/Engenharia.

### Fase D7 — Domínios e Especialização de Conteúdo (iterativo) (CONCLUÍDO)

- [x] Criar guias de usuário para cada domínio (Auth, Accounts, Transactions, Reports).
- [x] Criar documentação técnica (Admin) para cada domínio (esquemas de banco, fluxos de integração).
- [x] Links bidirecionais entre guias de usuário e referência de API (onde aplicável).

Critério de aceite:

- [x] Cada domínio tem uma página “Como usar” (User) e uma página “Arquitetura” (Admin) (via mapeamento de slug compartilhado).

### Fase D8 — Operações e persistência (iterativo) (CONCLUÍDO)

- [x] Prisma: migrations, generate, deploy e ambientes
- [x] Seed e dados de desenvolvimento
- [x] Deploy: Coolify, docker-compose e healthchecks
- [x] Jobs: limpeza de refresh tokens (in-process vs cron externo)
- [x] Refatoração de Erros: Padronização de envelopes e códigos de erro (Backend/Frontend)

Critério de aceite:

- [x] Operar o sistema sem ler código: como subir, migrar, debugar healthcheck e rollback básico
- [x] Erros são reportados de forma consistente em toda a stack.

## Backlog de engenharia — contratos em runtime

### E1 — Envelope de erro consistente (backend) (CONCLUÍDO)

- [x] Definir envelope único para erros HTTP, incluindo `requestId` e `code` quando aplicável
- [x] Não vazar detalhes internos (stack/SQL) em ambientes não locais

### E2 — Erros operacionais por domínio (backend) (CONCLUÍDO)

- [x] Padronizar erros de domínio com `statusCode` e `code` estáveis
- [x] Converter erros Prisma comuns para códigos de domínio

### E3 — Parse defensivo de erro (frontend) (CONCLUÍDO)

- [x] Ao receber `HttpErrorResponse`, fazer parse defensivo do payload de erro para extrair `message`, `code`, `requestId` e `issues`
- [x] Manter fallback para formatos legados e erros de rede

## Critérios de aceite globais

- [x] Todo documento tem “por que existe” e links de entrada/saída
- [x] Nenhum fluxo crítico fica sem referência (setup/auth/transactions/reports/prisma)
- [x] Documentos de ferramenta apontam para uma única fonte
