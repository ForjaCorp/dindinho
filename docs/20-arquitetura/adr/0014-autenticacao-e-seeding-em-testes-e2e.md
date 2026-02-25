---
id: adr-0014-autenticacao-e-seeding-e2e
title: "ADR 0014: Autenticação e Seeding em Testes E2E"
description: "Estratégia de autenticação global e seeding automatizado para garantir resiliência e velocidade nos testes Playwright."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "testes", "e2e", "autenticação", "playwright"]
mvp: true
createdAt: "2026-02-23"
---

# ADR 0014: Autenticação e Seeding Básico em Testes E2E

## 1. Contexto

A suíte de testes E2E do projeto (utilizando Playwright) dependia originalmente de configurações teóricas de "API-first" que tentavam chamar rotas inexistentes no backend (ex: `POST /api/test/setup`) para injetar dados falsos e contornar a tela de login. Além disso, o seeding do Prisma criava apenas o usuário de desenvolvimento, quebrando os testes padrão criados com a expectativa de outros usuários.

Isso causava falsos negativos em larga escala, pois o backend (Fastify) entrava em descompasso com os scripts de setup do Playwright. Havia a necessidade de decidir se gastaríamos tempo criando rotas inseguras e exclusivas de teste no backend ou se buscaríamos uma solução que validasse as rotas existentes com usuários estáticos perfeitamente espelhados.

## 2. Decisão

Para os testes de ponta a ponta (E2E), decidimos adotar a seguinte abordagem arquitetural:

1. **Setup de Sessão Global com UI Login (Headless):** O `global-setup.ts` do Playwright não exige mais endpoints especiais do backend. Ele instancia um browser por baixo dos panos e realiza de fato o login via a interface do Frontend (`/login`) preenchendo as credenciais normais e salvando as cookies e `localStorage` resultantes (tokens JWT) em um arquivo `state/auth.json`. Todos os testes dependentes de auth então reaproveitam esse arquivo instantaneamente via configuração estática do Playwright. Testes soltos que exigem deslogamento explícito setam `test.use({ storageState: { cookies: [], origins: [] } })` em tempo de execução.
2. **Seeding via Variáveis de Ambiente:** Os usuários E2E (`e2e@example.com`, etc.) não são construídos mockados via queries do frontend no setup. O próprio script oficial do Prisma `backend/src/scripts/seed.ts` agora possui uma lógica baseada em variável de ambiente (`AUTO_SEED=true`). Quando ligado, o Prisma automaticamente popula os usuários de que o Frontend depende sem poluir a branch de CI com backdoors ou expor controllers vulneráveis de manipulação de banco para Testes UI.

## 3. Consequências

- **Positivas:**
  - O backend não foi acoplado a lógicas nem bibliotecas exclusivas de "Test mode". Testamos exatamente a aplicação real na mesma lógica que a produção operará.
  - Como o login global agora passa pelos componentes Angular até a home (`/dashboard`), se o componente de autenticação ou de JWT falharem silenciosamente, a falha estoura diretamente no início da suíte (`global-setup`).
  - Sem necessidade de mocks pesados de rede; diminuição severa de manutenção e complexidade do `fixtures.ts`.
- **Negativas:**
  - O script original de Setup pode atrasar uns 1 a 2 segundos a mais a cada subida da suíte pois realiza um login na Renderização Real em modo Chromium. Totalmente aceitável devido aos ganhos em veracidade do teste UI e resiliência entre dev, setup e CI Docker.
