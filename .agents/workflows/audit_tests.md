---
description: Como auditar nossa suíte de testes e gerar novos testes. Adapte os comandos para o test runner que encontrou no nosso projeto.
---

# Fluxo: Auditoria e Geração de Testes (`/audit_tests`)

**Objetivo:** Melhorar a cobertura e testar os módulos da aplicação (Frontend, Backend e Shared) utilizando Vitest.

1. **Test Runners Disponíveis:**
   - No raiz do projeto (como macro suite): `turbo run test:unit`, `turbo run test:integration`, `turbo run test`.
   - No Backend: `npm start test:unit --prefix backend` / `vitest run`.
   - No Frontend: `ng test --watch=false` ou via NPM `npm --prefix frontend run ...`.
2. **Diretrizes para Novos Testes:**
   - **Linguagem:** As descrições em `describe` e `it` deverão sempre estar em PT-BR (ex: `it('deve retornar saldo atualizado')`).
   - **Elementos Visuais:** Utilizar o padrão kebab-case `data-testid="..."` no Frontend (ex: `data-testid="submit-button"`).
   - **Estruturação:** Utilize mockers padrão do ambiente, isolando externalidades (Network e DB se forem Unit Tests reais).
3. **Auditoria (Execução):**
   - Sugira rodar a suíte correspondente via terminal e capturar os relatórios para atuar cirurgicamente nos componentes quebrados.
