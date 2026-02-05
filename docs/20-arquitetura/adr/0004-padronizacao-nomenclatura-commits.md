---
id: adr-0004-padronizacao-nomenclatura-commits
title: "ADR 0004: Padronização de Nomenclatura e Commits"
description: "Adoção de padrões estritos para nomes de arquivos, variáveis e mensagens de commit."
audience: ["dev"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["padrões", "nomenclatura", "commits", "typescript"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0004: Padronização de Nomenclatura e Commits

## Status

Aceito (Implementado)

## Contexto

Em um monorepo com múltiplos desenvolvedores, a falta de padrões de nomenclatura leva a um código difícil de ler, buscar e manter. Mensagens de commit inconsistentes tornam o histórico do Git inútil para depuração ou geração automática de changelogs.

## Decisão

1.  **Nomenclatura de Arquivos:**
    - **Angular:** Sufixos explícitos (`.page.ts`, `.component.ts`, `.service.ts`).
    - **Geral:** Kebab-case para pastas e arquivos.
2.  **Código (TypeScript):**
    - `camelCase` para variáveis e funções.
    - `PascalCase` para classes, interfaces e tipos.
    - `UPPER_CASE` para constantes reais.
3.  **Commits (Conventional Commits):**
    - Formato: `tipo: descrição`.
    - Linguagem: **Português (PT-BR)**.
    - Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
4.  **Idioma do Negócio:**
    - Nomes de tabelas, campos de banco e lógica de domínio devem ser em **Inglês** (padrão de mercado).
    - JSDoc e descrições de testes devem ser em **Português** (para clareza com stakeholders de produto).

## Consequências

### Positivas

- **Legibilidade:** O código se torna autodescritivo.
- **Busca Eficiente:** Fácil encontrar arquivos por tipo ou domínio.
- **Histórico Limpo:** Facilita entender a evolução de funcionalidades através dos commits.
- **Onboarding:** Novos membros do time entendem rapidamente onde colocar cada coisa.

### Negativas / Desafios

- **Rigor na Revisão:** Requer atenção dos revisores de PR para garantir o cumprimento dos padrões.
- **Linting:** Necessidade de configurar regras de ESLint para automatizar parte dessas validações.
