---
id: dominio-contas
title: "Domínio: Contas Bancárias e Cartões"
description: "Gestão de contas correntes, poupanças e cartões de crédito do usuário."
audience: ["dev", "user"]
visibility: "public"
status: "wip"
owners: ["engineering"]
tags: ["accounts", "credit-card", "finance"]
mvp: true
createdAt: "2026-02-03"
---

# Contas Bancárias e Cartões

O domínio de **Contas** é o alicerce financeiro do Dindinho. Ele representa onde o dinheiro está armazenado e como o saldo é calculado.

## 🎯 Objetivo

- Permitir que o usuário organize seu dinheiro em diferentes "baldes" (contas).
- Gerenciar limites e fechamento de faturas de cartões de crédito.
- Fornecer a base para o cálculo de saldo total e histórico financeiro.

## 👥 Visão do Usuário (User Guide)

### Fluxos Principais

1. **Criar Conta**: O usuário define nome, cor, ícone e saldo inicial.
2. **Configurar Cartão**: Ao escolher o tipo "Crédito", o usuário define dia de fechamento, vencimento e limite disponível.
3. **Visualizar Saldo**: O dashboard exibe o saldo consolidado de todas as contas do tipo padrão.

### Interface (PWA)

- **Dashboard**: Cards resumidos das contas e cartões.
- **Página de Contas**: Lista detalhada com ações de editar e excluir.
- **Modais**: Formulários rápidos para ajustes de saldo ou limites.

## 🛠️ Visão Técnica (Admin/Engineering)

### Modelo de Dados

Referência no [schema.prisma](../../backend/prisma/schema.prisma):

- `Account`: Entidade principal vinculada ao `User`.
- `CreditCardInfo`: Extensão 1:1 para detalhes de faturas.
- `DailySnapshot`: Tabela de performance para histórico de saldo.

### Regras de Negócio (Invariantes)

- Uma conta deve sempre pertencer a um `User`.
- Contas do tipo `CREDIT` devem obrigatoriamente ter um registro associado em `CreditCardInfo`.
- O saldo de uma conta é a soma do `initialBalance` com todas as transações `INCOME` menos `EXPENSE`.

### Integração e API

- **Endpoints**: `/api/accounts` (CRUD completo).
- **Contratos**: Schemas em `@dindinho/shared/src/schemas/account.schema.ts`.

## 🔗 Links Úteis

- [Referência de API](../30-api/openapi.json)
- [Esquema de Banco de Dados](../../backend/prisma/schema.prisma)
