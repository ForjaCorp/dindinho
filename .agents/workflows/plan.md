---
description: Como planejar tecnicamente o desenvolvimento de uma nova funcionalidade antes de sair escrevendo arquivos soltos.
---

# Fluxo: Planejamento (`/plan`)

**Objetivo:** Estruturar mentalmente as alterações e arquiteturas antes de sair despejando código em dezenas de arquivos diferentes no Monorepo (evitando quebra de builds e retrabalho).

1. **Levantamento e Auditoria:** Analise a descrição e regras de negócio da requisição. Use `grep_search` ou ferramentas de listagem para validar se já existe algo semelhante em `/packages/shared`, `/backend` ou `/frontend`.
2. **Definir Camadas Impactadas**:
   - Backend (`/backend/prisma/schema.prisma`): Precisa de uma nova tabela ou relação? Documente a necessidade de `npm run prisma:generate`.
   - APIs Rest (Rotas, Services e Models): Como os contratos de Request e Response (via Zod em `@dindinho/shared`) se comunicarão?
   - Frontend (`/frontend`): Os roteamentos Angular, lazy-loads e Signals (`app.routes.ts`, standalone components e pages) deverão ser projetados?
3. **Plano Tático Etapas:** Escreva as etapas lógicas exatas, arquivo por arquivo (ou ao menos camada por camada), em que as funcionalidades serão implementadas.
4. **Acordo:** Peça ao usuário uma validação: *"O escopo e estrutura pensados estão corretos de acordo com suas expectativas?"*
