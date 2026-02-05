---
id: qa-test-strategy
title: "Estratégia de QA e Testes"
description: "Princípios, ferramentas e padrões de testes automatizados no ecossistema Dindinho."
audience: ["dev", "qa"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["qa", "testes", "vitest", "playwright", "qualidade"]
mvp: true
createdAt: "2026-02-05"
---

# Estratégia de QA e Testes 🧪

No Dindinho, a qualidade não é uma fase posterior ao desenvolvimento, mas uma parte integrante do processo de engenharia. Seguimos uma abordagem de **Test-Driven Development (TDD)** e **Zero-Tolerance** para regressões.

## Pirâmide de Testes

Nossa estratégia é baseada na pirâmide de testes clássica, com foco em velocidade de execução e confiabilidade.

1.  **Testes Unitários (Base):** Validam lógica pura, serviços e pipes. Executados com Vitest.
2.  **Testes de Componente (Meio):** Validam a interação do template com o componente e mocks de serviços.
3.  **Testes E2E (Topo - Em Roadmap):** Fluxos críticos de usuário (login, transação, relatórios). Planejado com Playwright.

## Ferramentas

| Camada                       | Ferramenta                       | Objetivo                                |
| :--------------------------- | :------------------------------- | :-------------------------------------- |
| **Frontend Unit/Component**  | Vitest + Angular Testing Library | Rapidez e isolamento.                   |
| **Backend Unit/Integration** | Vitest + Supertest               | Validação de rotas e lógica de domínio. |
| **End-to-End (E2E)**         | Playwright (Roadmap)             | Simulação real de usuário no navegador. |
| **Linting**                  | ESLint                           | Garantia de padrões de código.          |

## Padrões e Convenções

### Identificação de Elementos

Sempre utilize `data-testid` para selecionar elementos em testes. Nunca use classes CSS ou IDs que podem mudar por razões estéticas.

```html
<button data-testid="submit-transaction">Enviar</button>
```

### Mocking

- **Serviços:** Use mocks leves para serviços injetados.
- **API:** No frontend, usamos mocks de provedores ou interceptores para evitar chamadas reais à rede durante testes unitários.

### Descrições (PT-BR)

As descrições dos testes devem ser claras e em Português do Brasil:

```typescript
it('deve validar que o saldo não pode ser negativo', () => { ... });
```

## Execução e Comandos Turbo

Utilizamos o **Turbo (Turborepo)** para gerenciar e acelerar a execução de tarefas em todo o monorepo. Sempre prefira usar os comandos na raiz do projeto.

| Comando                    | Descrição                                | Escopo   |
| :------------------------- | :--------------------------------------- | :------- |
| `npm run test`             | Executa todos os testes do monorepo      | Monorepo |
| `npm run test:unit`        | Executa apenas testes unitários          | Monorepo |
| `npm run test:integration` | Executa testes de integração (Backend)   | Monorepo |
| `npm run lint`             | Valida padrões de código e estilo        | Monorepo |
| `npm run typecheck`        | Valida tipagem TypeScript                | Monorepo |
| `npm run quality:ci`       | Pipeline completo (Lint + Tests + Build) | CI/Local |

### Execução em Desenvolvimento

Para rodar testes em modo watch durante o desenvolvimento:

- **Frontend:** `npm --prefix frontend run test`
- **Backend:** `npm --prefix backend run test`

## Pipeline de CI (GitHub Actions)

Nossa integração contínua é automatizada via GitHub Actions e está definida em [.ci.yml](file:///home/vinicius/dev/dindinho/.github/workflows/ci.yml). O pipeline é otimizado para velocidade usando cache do Turbo e execução seletiva (apenas o que foi afetado em PRs).

### Etapas do Pipeline

1.  **Validação de Documentação:** Executa `npx turbo run docs:check` para garantir integridade de links e metadados.
2.  **Instalação e Build:** Instala dependências e realiza o build dos pacotes compartilhados.

### Qualidade (Execução Seletiva)

    - **Em PRs:** Executa `npm run quality:ci` apenas nos pacotes afetados pelas mudanças.
    - **Na Main:** Executa a verificação completa de todo o monorepo.

> [!TIP]
> O comando `quality:ci` engloba `lint`, `typecheck`, `build`, `test` (unitários) e `test:integration` (API/Serviços).

## Roadmap de Testes (Em Planejamento)

Atualmente, o foco está na cobertura de testes unitários e de integração (API). A implementação de testes de ponta a ponta (E2E) está planejada para fases futuras.

1.  **Testes E2E (UI):** Planejado o uso de **Playwright** para validar fluxos críticos de usuário no Frontend.
2.  **Testes de Performance:** Planejado para rotas críticas de sincronização de dados.

---

**STATUS: ATUALIZADO**

> Mantenha a cobertura de testes acima de 80% para lógica de negócio crítica.
