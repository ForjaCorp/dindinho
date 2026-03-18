---
description: Passo a passo metodológico em que a IA pesquisa logs, analisa o stack trace e resolve erros persistentes em vez de ficar reescrevendo código em loop de tentativa e erro cega.
---

# Fluxo: Mapear e Resolver Erros Complexos (`/handle_errors`)

**Objetivo:** Metodologia estrita para interromper ciclos infinitos de alucinação entre o código e o Agent, garantindo debug cirúrgico ao invés de alteração cega.

1. **Isolar e Catalogar o Erro:**
   - Você recebeu um problema? Execute os logs corretos para entender: leia `docker compose logs -f` se for DB. Peça a output de `turbo run build` ou `npm run dev` se for build e erro do typescript.
   - Leia a **stack trace inteira**. Do começo ao fim. Frequentemente o que falhou está no começo e causou erro de cascata.
2. **Formular a Hipótese:** Baseado na leitura, diga pro usuário qual você acha ser a causa raiz sem recriar as funções.
3. **Proteção Contra Loop:**
   - Regra 1: Você NUNCA tenta novamente um reparo sem desfazer (backtrack) uma operação de reparo anterior não surtiu efeito, ela é apenas ruído adicional.
   - Regra 2: Se fez duas as operações/tentativas consecutivas sem erradicar a Stack Trace, ALERTE. Crie e mostre os itens no chat para o humano dizendo: "Eu tentei alterar [Arquivo X], e logo tentar desativar cache em [Arquivo Y], porem caí nesta mesma falha. Vamos repensar a estratégia?". Peça auxílio, referencie as limitações locais da infra.
