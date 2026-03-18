---
description: Tarefas de git, manipulação de branch, merges, status de PRs usando ferramentas de linha de comando.
---

# Fluxo: Ferramentas de Git / Github (`/github`)

**Objetivo:** Manter a higiene e sincronia das branches no controle de versão do repositório Dindinho.

1. **Estado do Repositório:** A qualquer momento, avalie `git status` e verifique diffs de arquivos modificados antes de proceder.
2. **Boas Práticas de Branching:** Nunca enviar ou trabalhar em `main` diretamente (salvo orientação estrita).
   - Fluxo de trabalho: `git checkout -b <prefixo>/<atividade>`. Prefira prefixes como `feat/`, `fix/`, `chore/`.
3. **Sincronia Global:** Para resolver problemas com repositórios distantes usando `git fetch origin` e avaliando updates antes de integrar. Se existirem conflitos no Monorepo, use ferramentas de merge (ex: via rebase para um histórico linear, mas pule caso rebase envolva destruição de commits compartilhados ativamente).
4. **Automação:** Sempre lembre que as amarras locais de git hooks do Husky rodarão processos do TurboRepo (`npm run lint`, `vitest`, `typecheck`), tornando `git commit` ou `git push` propensos a cancelamento caso quebrem o workflow. Antecipe-se e rode esses passos caso existam mudanças pesadas na arquitetura.
