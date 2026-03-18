---
description: Processo e template para criar um novo ADR (Architecture Decision Record) ao implementarmos soluções complexas.
---

# Fluxo: Criar Decisão de Arquitetura (`/create_adr`)

**Objetivo:** Arquiteturar a infra com histórico. Se uma biblioteca for trocada ou inserida para uma camada de projeto, ou uma grande quebra estrutural for criada no Dindinho, uma documentação central é necessária.

1. **Onde moram os Arquivos:** Devem ficar padronizados em `.md` nas trilhas de docs, geralmente acessíveis a partir de `docs/90-backlog/planning/documentation.md`.
2. **Template a Cumprir:** Ao gerar, você deve seguir essas seções num `.md`:
   - Title (Nome da decisão Ex: "001 - Troca de Fastify por Hono")
   - Status (Proposta | Aprovada | Depreciada)
   - Contexto (Explicação de "A dor que temos com o framework atual" ou com a demanda recente)
   - Decisão (Mudemos para a lib Y no subpackage X porque...)
   - Regras Aplicadas e Consequências (Ganhamos performance mas perdemos tal tipagem e criamos dependência no pacote Z).
3. **Passo Comum:** Escreva o arquivo .md na pasta selecionada, mostre ao usuário os Trade-offs adicionados à pagina, e aguarde validação final de "Aprovo" do user para commitar.
