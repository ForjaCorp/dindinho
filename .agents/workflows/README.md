---
description: Índice e introdução aos workflows do Projeto Dindinho
---

# Fluxos de Trabalho do Assistente de IA

Esta pasta (`.agents/workflows/`) contém os manuais de procedimentos para executar tarefas específicas no repositório `dindinho-monorepo`. Quando precisar atuar, o assistente lerá essas instruções para garantir que siga os padrões de arquitetura (Turbo, Angular, Prisma, Fastify/Hono) e execute estritamente os scripts locais.

## Comandos Disponíveis (Workflows)

- `/ask` (`ask.md`): Dúvidas e análise de código sem gerar código imediato.
- `/plan` (`plan.md`): Planejamento de funcionalidades.
- `/review` (`review.md`): Revisões de código e Pull Requests.
- `/audit_docs` (`audit_docs.md`): Revisão de documentação de domínio e técnica.
- `/audit_tests` (`audit_tests.md`): Geração e verificação de testes Vitest/Angular.
- `/github` (`github.md`): Gestão de branches e status via linha de comando.
- `/qa` (`qa.md`): Testes de QA manuais/automatizados.
- `/commit_code` (`commit_code.md`): Formatação correta de PRs e padronização Husky/Lint-Staged.
- `/handle_errors` (`handle_errors.md`): Fluxo inteligente para debugar problemas do monorepo e prevenir _loops infinitos_.
- `/create_adr` (`create_adr.md`): Registro de decisões arquiteturais.
- `/create_package` (`create_package.md`): Boilerplate para novos módulos ou pacotes compartilhados no Turborepo.
