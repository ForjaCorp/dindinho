---
description: O passo a passo para revisar um novo pull request ou código que acabamos de escrever, verificando segurança, coerência com as regras e anti-patterns.
---

# Fluxo: Code Review (`/review`)

**Objetivo:** Agir como CI/Quality Enginer ao ler as diffs ou arquivos desenvolvidos contra as regras internas do repositório Dindinho.

1. **Analisar o Frontend (Angular / PrimeNG):**
   - Garanta que não existam animações via modulo principal (o app usa nativo migrado PrimeNG v21).
   - O control flow é puro Angular v17+ (`@if`, `@for`, etc.), ausentando velhos `*ngIf/*ngFor`.
   - Signals estão sendo usados de forma limpa (sem mutação direta inadequada).
   - Existe ruído de console em testes com erros mockados? (Deve-se evitar).
2. **Analisar o Backend e Shared:**
   - Zod/Interfaces estão corretas e hospedadas com Type check passando (TypeScript Estrito).
   - Consultas do Prisma não trazem dados sensíveis indiscriminadamente (`select: {}`)?
3. **Padrão e Lint:** Valide se há inconsistências pontuais (indentação com 2 espaços, chaves e `camelCase`/`PascalCase` como o padrão define).
4. **Relatório:** Emita os problemas encontrados focando primeiramente naqueles com potenciais "Bugs" e depois nas "Adequações Arquiteturais", em português do Brasil e com trechos comparativos.
