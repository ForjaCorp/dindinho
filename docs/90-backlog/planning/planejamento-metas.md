---
id: planejamento-metas-economia
title: "Metas de Economia (Limites e Objetivos)"
description: "Planejamento para implementação do sistema de metas híbrido, cobrindo limites de gastos por categoria e objetivos de poupança."
audience: ["dev", "ops"]
visibility: "internal"
status: "draft"
owners: ["engineering"]
tags: ["planning", "rfc", "budgets", "goals"]
mvp: true
createdAt: "2026-02-03"
---

# Planejamento: Metas de Economia (Limites e Objetivos)

## 📝 Contexto e Problema

- **Cenário Atual**: O usuário consegue ver seus gastos, mas não tem uma ferramenta para impor limites ou acompanhar o progresso de sonhos (poupança).
- **Por que agora?**: O controle financeiro eficaz exige tanto a redução de danos (limites) quanto a motivação para poupar (objetivos).

## 🚀 Proposta de Solução

Implementar um sistema de **Metas Híbrido** que suporte dois tipos de comportamento:

1.  **Limites de Gastos (`SPENDING_LIMIT`)**:
    - Focado em categorias (ex: Lazer, Alimentação).
    - O sistema monitora as transações do mês e avisa o percentual de uso do limite.
2.  **Objetivos de Poupança (`SAVINGS_GOAL`)**:
    - Focado em um valor final (ex: R$ 2.000 para o show do BTS).
    - O sistema monitora o saldo acumulado em categorias de "Investimento/Poupança" ou em contas específicas marcadas para este fim.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Infraestrutura e Modelo de Dados

- [ ] Criar tabela `Budget` no Prisma com suporte a `BudgetType`.
- [ ] Implementar relações com `Category` e `User`.
- **Critérios de Aceite**: Banco preparado para armazenar tanto limites quanto objetivos.

### Fase 2: Motor de Cálculo e API

- [ ] Criar serviço no backend para calcular o progresso das metas em tempo real.
- [ ] Endpoint `GET /api/budgets`: Listagem com progresso calculado (`currentAmount` / `targetAmount`).
- [ ] Endpoint `POST /api/budgets`: Criação de metas com validação de tipo.
- **Critérios de Aceite**: API retornando o progresso percentual de cada meta.

### Fase 3: Interface e Visualização

- [ ] Dashboard de Metas no PWA com barras de progresso.
- [ ] Widgets de alerta no resumo mensal ("Você já gastou 80% do seu limite de Lazer").
- **Critérios de Aceite**: Usuário visualiza claramente o quanto falta para seu objetivo ou o quanto resta do seu limite.

## 🏗️ Impacto Técnico

- **Banco de Dados**:
  - Nova tabela `Budget`.
  - Enum `BudgetType { SPENDING_LIMIT, SAVINGS_GOAL }`.
- **API**:
  - Lógica de agregação no banco para somar transações por categoria/período para metas de limite.
- **Frontend**:
  - Novos componentes PrimeNG (ProgressBar).

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário para o cálculo de progresso).
- [ ] Documentação de domínio em `docs/10-product/dominio-metas.md`.
- [ ] Lint/Typecheck sem erros.
