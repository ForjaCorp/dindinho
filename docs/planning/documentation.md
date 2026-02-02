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

export const docAudienceSchema = z.enum(["dev", "ops", "product", "user"]);
export type DocAudienceDTO = z.infer<typeof docAudienceSchema>;

export const docVisibilitySchema = z.enum(["internal", "public"]);
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

### Fase D0 — Inventário e pontos de entrada (1 PR)

- Consolidar links entre `README.md` (root), `backend/README.md`, `frontend/README.md` e `docs/`
- Definir a árvore alvo do `docs/` (taxonomia) e mover documentos existentes sem perder links
- Definir o que será público vs interno (visibilidade)

Critério de aceite:

- Qualquer pessoa consegue: rodar local, entender MVP e achar Auth/Reports/Transactions

### Fase D1 — Padrões de contrato e compatibilidade (1 PR)

- Formalizar e estabilizar o envelope de erro (`ApiErrorResponseDTO`) como contrato central
- Definir guideline de versionamento do `@dindinho/shared` para mudanças incompatíveis
- Formalizar convenções de validação:
  - `body/querystring/params/response` sempre em Zod
  - coerções (`z.coerce`) e `.transform` devem ser previsíveis

Critério de aceite:

- Uma página em `docs/30-api/` referencia o contrato de erro e validações

### Fase D2 — Metadados de docs e backlog estruturado (1 PR)

- Adicionar `docFrontmatterSchema` e `backlogItemSchema` ao `@dindinho/shared`
- Definir convenção de frontmatter para cada doc planejado

Critério de aceite:

- Todo doc novo tem `id/title/owners/status/visibility/audience`

### Fase D3 — Geração de OpenAPI (2 PRs)

PR A (infra):

- Adicionar plugin Swagger ao backend
- Configurar transformação Zod → JSON Schema para Swagger
- Expor rota interna de spec (ex.: `/internal/openapi.json`) ou gerar arquivo em build

PR B (governança):

- Padronizar `summary/tags` em todas as rotas
- Padronizar respostas de erro por status (401/403/404/409/422)

Critério de aceite:

- Spec gera sem erros e cobre rotas principais (auth/accounts/transactions/reports)

### Fase D4 — Portal de docs (3 PRs)

PR A (skeleton):

- Criar um app de docs no monorepo (site estático)
- Integrar conteúdo de `docs/` como fonte

PR B (API):

- Renderizar `openapi.json` dentro do portal

PR C (qualidade):

- Checagem de links internos
- Validação de frontmatter com Zod

Critério de aceite:

- Portal roda localmente e a navegação cobre os fluxos críticos

### Fase D5 — Deploy no Coolify (1 PR)

- Adicionar um serviço `docs` no `docker-compose.coolify.yml` ou incorporar ao container do frontend como rota `/docs`
- Definir variáveis/URLs e healthcheck do serviço de docs

Critério de aceite:

- Portal disponível em produção (ex.: `https://app.seudominio.com/docs` ou `https://docs.seudominio.com/`)

### Fase D6 — Separação “público vs interno” (1 PR)

- Definir subconjunto público (ex.: política, onboarding, FAQ, pricing)
- Restringir o conteúdo interno (Coolify auth, rede privada, ou build separado)

Critério de aceite:

- Conteúdo público não vaza detalhes operacionais (infra, endpoints internos, decisões sensíveis)

### Fase D7 — Domínios do backend (iterativo por módulo)

- Auth (login/refresh/logout, tokens, allowlist, rate limiting)
- Accounts (tipos STANDARD/CREDIT, campos relevantes)
- Transactions (filtros, paginação, recorrência/parcelamento, invoiceMonth)
- Reports (endpoints, filtros e drill-down)
- Categories e Waitlist

Critério de aceite:

- Cada domínio tem uma página “como funciona” e links para contratos/endpoints

### Fase D8 — Operações e persistência (iterativo)

- Prisma: migrations, generate, deploy e ambientes
- Seed e dados de desenvolvimento
- Deploy: Coolify, docker-compose e healthchecks
- Jobs: limpeza de refresh tokens (in-process vs cron externo)

Critério de aceite:

- Operar o sistema sem ler código: como subir, migrar, debugar healthcheck e rollback básico

## Backlog de engenharia — contratos em runtime

### E1 — Envelope de erro consistente (backend)

- Definir envelope único para erros HTTP, incluindo `requestId` e `code` quando aplicável
- Não vazar detalhes internos (stack/SQL) em ambientes não locais

### E2 — Erros operacionais por domínio (backend)

- Padronizar erros de domínio com `statusCode` e `code` estáveis
- Converter erros Prisma comuns para códigos de domínio

### E3 — Parse defensivo de erro (frontend)

- Ao receber `HttpErrorResponse`, fazer parse defensivo do payload de erro para extrair `message`, `code`, `requestId` e `issues`
- Manter fallback para formatos legados e erros de rede

## Critérios de aceite globais

- Todo documento tem “por que existe” e links de entrada/saída
- Nenhum fluxo crítico fica sem referência (setup/auth/transactions/reports/prisma)
- Documentos de ferramenta apontam para uma única fonte
