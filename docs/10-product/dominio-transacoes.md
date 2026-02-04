---
id: dominio-transacoes
title: "Transações e Categorias"
description: "O coração financeiro do sistema: registro de entradas, saídas e organização por categorias."
audience: ["dev", "user"]
visibility: "public"
status: "wip"
owners: ["product", "engineering"]
tags: ["transactions", "finance", "categories"]
mvp: true
createdAt: "2026-02-03"
---

# Transações e Categorias

Este domínio gerencia todos os lançamentos financeiros do usuário, permitindo o rastreamento preciso de onde o dinheiro vem e para onde ele vai.

## 🎯 Objetivo

- Registrar receitas, despesas e transferências entre contas.
- Organizar gastos através de uma hierarquia de categorias.
- Suportar lançamentos parcelados e recorrentes.
- Marcar transações como pagas ou pendentes (conciliação).

## 👥 Visão do Usuário (User Guide)

### Fluxos Principais

1.  **Novo Lançamento**: Fluxo rápido para registrar um gasto ou ganho, selecionando conta e categoria.
2.  **Transferência**: Mover saldo entre duas contas (ex: da conta corrente para a poupança).
3.  **Parcelamento**: Dividir uma compra em N vezes, com geração automática de lançamentos futuros.
4.  **Categorização**: Criar categorias personalizadas (ex: "Pets", "Streaming") para organizar o orçamento.

### Interface (PWA)

- **Extrato**: Lista cronológica de transações com filtros por data, conta e tipo.
- **Formulário Inteligente**: Sugestão de categorias baseada na descrição.
- **Indicadores de Status**: Cores e ícones para diferenciar Receitas (Verde) de Despesas (Vermelho).

## 🛠️ Visão Técnica (Admin/Engineering)

### Modelo de Dados

Referência no [schema.prisma](../../backend/prisma/schema.prisma):

- `Transaction`: Tabela principal. Note o uso de `Decimal` para evitar erros de precisão de ponto flutuante.
- `Category`: Estrutura de árvore (Auto-relacionamento `parentId`) para categorias e subcategorias.
- `TransactionType`: Enum com `INCOME`, `EXPENSE` e `TRANSFER`.

**Campos Chave:**

- `isPaid`: Booleano para controle de fluxo de caixa vs. competência.
- `recurrenceId`: Vincula transações que fazem parte de uma mesma série (parcelas ou fixas).

### Integração e API

- **Endpoints**: `/transactions/*` e `/categories/*` na [Referência de API](../30-api/openapi.json).
- **Lógica de Negócio**: Cálculo de saldos em tempo real e geração de snapshots diários.
- **Contratos**: Schemas Zod em `packages/shared/src/schemas/transaction.schema.ts`.

## 🔗 Links Úteis

- [Lógica de Saldo](../../backend/src/transactions/transactions.service.ts)
- [Página de Lançamentos](../../frontend/src/pages/transactions/transactions.page.ts)
