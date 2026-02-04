---
id: dominio-metas-economia
title: "Metas de Economia"
description: "Gestão de limites de gastos por categoria e objetivos de poupança para controle financeiro pessoal."
audience: ["dev", "user"]
visibility: "public"
status: "draft"
owners: ["engineering"]
tags: ["dominio", "metas", "budgets", "goals"]
mvp: true
createdAt: "2026-02-03"
---

# 🎯 Metas de Economia

O domínio de Metas de Economia é o coração do planejamento financeiro no Dindinho. Ele permite que o usuário não apenas acompanhe o que já aconteceu (extrato), mas projete o futuro através de dois mecanismos principais: **Limites de Gastos** e **Objetivos de Poupança**.

## 🎯 Objetivo

- **Controle de Gastos**: Definir tetos para categorias específicas (ex: "Não gastar mais de R$ 500 com lazer").
- **Planejamento de Sonhos**: Reservar valores para objetivos específicos (ex: "Juntar R$ 2.000 para o show do BTS").
- **Saúde Financeira**: Visualizar o progresso em tempo real e receber alertas de proximidade do limite.

## 👥 Visão do Usuário (User Guide)

### Fluxos Principais

1. **Criar Limite de Gastos**:
   - Selecionar uma categoria ou grupo de contas.
   - Definir o valor máximo para o período (mensal/anual).
   - Acompanhar o consumo através de barras de progresso que mudam de cor (Verde -> Amarelo -> Vermelho).

2. **Criar Objetivo de Poupança**:
   - Definir um nome (ex: "Viagem de Férias").
   - Definir o valor alvo e a data desejada.
   - Vincular a uma conta específica ou "fundo virtual".
   - Visualizar a porcentagem concluída e quanto falta por mês para atingir a meta.

### Interface (PWA)

- **Dashboard de Metas**: Visão geral com cartões para cada meta ativa.
- **Gráficos de Progresso**: Visualização circular ou linear do status atual.
- **Feedback Visual**: Uso de cores semânticas para indicar perigo (gastos excessivos) ou sucesso (objetivo atingido).

## 🛠️ Visão Técnica (Admin/Engineering)

### Modelo de Dados

As metas são centralizadas na tabela `Budget`, diferenciadas pelo campo `type`.

- **SPENDING_LIMIT**: Vinculado a categorias de despesa. O progresso é calculado pela soma das transações de saída.
- **SAVINGS_GOAL**: Vinculado ao saldo de contas ou transações de aporte. O progresso é o saldo acumulado versus o alvo.

**Invariantes:**

- Uma meta de gasto não pode ter valor alvo negativo.
- O cálculo de progresso deve considerar apenas transações confirmadas.

### Integração e API

- **Cálculo de Progresso**: Serviço centralizado que agrega transações do período.
- **Notificações**: Gatilhos quando o consumo atinge 80%, 90% e 100% de um limite.

## 🔗 Links Úteis

- [Planejamento de Metas](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/planejamento-metas.md)
- [Esquema do Banco](file:///home/vinicius/dev/dindinho/backend/prisma/schema.prisma)
