---
description: Instruções de como formatar e enviar código usando as melhores práticas de versionamento estipuladas.
---

# Fluxo: Commits Manuais (`/commit_code`)

**Objetivo:** Consolidar e salvar trabalhos com uma semântica de repositório correta (Conventional Commits) no repósitorio Dindinho.

1. **Requisitos de Sistema Base:** O projeto tem Husky instalado em hook local nos steps `commit-msg` e `pre-commit` (para Prettier e Lint-staged). Qualquer lixo passará por um `npm run lint`.
2. **Métricas de Pre-flight (opcionais quebram hooks):**
   - Executar uma rodada seca `turbo run typecheck` na pasta pode evitar a vergonha num CI global ou num pré-push.
3. **Formato Exigido do Commit:**
   - `<tipo>: <descrição compactada, e no presente ou indicativo>`
   - Tipos comuns: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`.
   - Apenas mensagens amigáveis em Português-BR.
   - Exemplo: `feat: adiciona componente header standalone` ou `fix: corrige responsividade do dashboard`.
4. **Execução:** Formule a string em bash (com escapes corretos) e chame `git commit -m "..."`.
