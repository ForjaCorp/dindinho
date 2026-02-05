---
id: naming-conventions
title: "Convenções e Nomenclatura"
description: "Padronização de nomes de arquivos, variáveis, commits e documentação no Dindinho."
audience: ["dev"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["padrões", "nomenclatura", "typescript", "commits"]
mvp: true
createdAt: "2026-02-05"
---

# Convenções e Nomenclatura 🏷️

Para manter a consistência em um monorepo, seguimos regras estritas de nomenclatura e estilo, priorizando a clareza e a facilidade de busca.

## Arquivos e Pastas

### Frontend (Angular)

- **Componentes de Página:** `*.page.ts` (ex: `login.page.ts`)
- **Componentes Reutilizáveis:** `*.component.ts` (ex: `button.component.ts`)
- **Serviços:** `*.service.ts`
- **Testes:** `*.spec.ts`

### Backend (Fastify)

- **Rotas:** `*.routes.ts`
- **Serviços/Lógica:** `*.service.ts`
- **Modelos/Schemas:** `*.model.ts` ou `*.schema.ts`

### Documentação (`/docs`)

- **Pastas:** kebab-case em português (ex: `10-produto`, `20-arquitetura`).
- **Arquivos:** kebab-case em português (ex: `guia-usuario.md`, `regras-negocio.md`).
- **Slugs:** kebab-case em português (definidos no `docs.page.ts`).

## Código (TypeScript)

| Elemento               | Padrão     | Exemplo                                      |
| :--------------------- | :--------- | :------------------------------------------- |
| **Variáveis/Funções**  | camelCase  | `const userData`, `function getUser()`       |
| **Classes/Interfaces** | PascalCase | `class AuthService`, `interface UserProfile` |
| **Constantes**         | UPPER_CASE | `const MAX_RETRY_ATTEMPTS = 3`               |
| **Componentes UI**     | PascalCase | `@Component({ selector: 'AppHeader' })`      |

## Commits (Conventional Commits)

As mensagens de commit devem ser em **português** e seguir o formato: `tipo: descrição breve`.

- `feat:` Novas funcionalidades.
- `fix:` Correção de bugs.
- `docs:` Alterações apenas em documentação.
- `style:` Alterações que não afetam o significado do código (espaços, formatação).
- `refactor:` Alteração de código que não corrige bug nem adiciona funcionalidade.
- `test:` Adição ou correção de testes.
- `chore:` Atualização de tarefas de build, pacotes, etc.

**Exemplo:** `feat: adiciona validação de saldo insuficiente`

## Documentação (Docs-as-Code)

- **Linguagem:** 100% PT-BR (exceto termos técnicos).
- **JSDoc:** Obrigatório em APIs públicas e lógicas complexas.
- **PT-BR nos Testes:** Descrições de `it()` e `describe()` devem ser em português para facilitar o entendimento do negócio.

---

**Regra de Ouro:**

> Se você precisar de um comentário para explicar o que uma variável faz, o nome dela provavelmente não é bom o suficiente.
