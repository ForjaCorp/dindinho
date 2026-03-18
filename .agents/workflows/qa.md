---
description: Workflow manual ou automatizado de testes de QA cruzando Infra e Frontend validando fluxo de usuário.
---

# Fluxo: Quality Assurance (QA) (`/qa`)

**Objetivo:** Fazer garantia de uso da aplicação "End-to-End" simulando como as peças do Monorepo processam juntas e apontando gargalos de usabilidade (UI/UX) e APIs.

1. **Subir a Infraestrutura:**
   - Necessário garantir os contêiners rodando: `npm run db:up`.
   - Garanta que Prisma e ambiente estejam populados (rodar as Migrations e Seeds necessárias via `npm run setup:dev`).
   - Inicie a interface e o servidor de desenvolvimento: `npm run dev`.
2. **Auditorias Visuais e de Acessibilidade:**
   - Checar adequação WCAG AA: verificar foco, contraste visível, contraste da font, e semânticas ARIA se pertinentes.
3. **Casos de Teste Chaves:**
   - Operar caminhos felizes de features como se fosse o usuário acessando a SPA. O login falha? Há feedback reativo via Signals da UI do PrimeNG?
4. **Network Log:** Avaliar o painel de redes para certificar de payloads com peso desnecessário indo pro Frontend. O Backend (Fastify/Hono) está retornando chaves excessivas e sobrecarregando o parse do zod publicamente?
