---
description: Avalia e conserta discrepâncias entre READMEs, documentação e infraestrutura técnica de código.
---

# Fluxo: Auditoria de Documentações (`/audit_docs`)

**Objetivo:** Realizar curadoria do padrão *Docs-as-Code* do Dindinho, certificando-se de que nada fique defasado (arquitetura e contratos).

1. **Arquitetura JSDoc no Código:** Garanta que serviços-chave e funções do Monorepo tenham descrições estritas e exemplos quando forem complexos:
   - Funções/Classes exportadas que operem cross-module ou publicamente.
   - Rotas/Services de entrada e saída.
   - Apenas JSDoc útil em PORTUGUÊS-BR. Fale o que é invariante e comportamentos colaterais, evite comentar óbvios de DTOs.
2. **Auditoria nas Raízes:**
   - Abra o `README.md` (root e dos workspaces, `frontend/README.md` e `backend/README.md`) para averiguar se os comandos Turbo / npm run ali exemplificados conferem com o `package.json` real.
3. **Verificação de Backlogs & Manuais:** Procure conferir a pasta `docs/90-backlog/planning/documentation.md`. Certifique-se de que tags estão corretas (curtas, amigáveis).
