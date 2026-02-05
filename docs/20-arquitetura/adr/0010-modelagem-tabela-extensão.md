---
id: adr-0010-modelagem-tabela-extensão
title: "ADR 0010: Modelagem de Dados via Tabela de Extensão"
description: "Uso do padrão de composição de tabelas (1:1) para estender entidades base com atributos específicos de subtipos."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "backend", "banco-de-dados", "modelagem"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0010: Modelagem de Dados via Tabela de Extensão

## Status

**Aceito** (Estável)

## Contexto

No domínio financeiro, diferentes tipos de contas (Carteiras) compartilham atributos comuns (nome, cor, ícone), mas possuem comportamentos e dados drasticamente diferentes. Por exemplo, um Cartão de Crédito precisa de dia de fechamento e vencimento, enquanto uma conta corrente não. Colocar todos esses campos em uma única tabela `Wallet` resultaria em muitas colunas nulas e uma estrutura confusa.

## Decisão

Adotamos o padrão de **Tabela de Extensão (Table-per-Type/Composition)**:

1.  **Tabela Base (`Wallet`):** Contém os campos comuns a todos os tipos de carteira.
2.  **Tabela de Extensão (`CreditCardInfo`):** Contém campos exclusivos para cartões de crédito.
3.  **Relacionamento:** Um relacionamento 1:1 onde a chave primária (ou uma FK única) de `CreditCardInfo` aponta para `Wallet`.
4.  **Lógica de Negócio:** No backend, ao criar uma carteira do tipo `CREDIT`, o sistema garante a criação atômica do registro correspondente na tabela de extensão.

## Consequências

### Prós

- **Normalização:** Mantém o banco de dados limpo e evita colunas esparsas (cheias de nulos).
- **Extensibilidade:** É fácil adicionar novos tipos de carteira no futuro (ex: Investimentos, Cripto) criando novas tabelas de extensão sem alterar a tabela base.
- **Performance:** Consultas que não precisam de dados de crédito não carregam colunas desnecessárias.

### Contras

- **Complexidade de Query:** Exige `JOINs` para recuperar o objeto completo da carteira de crédito.
- **Integridade Referencial:** Exige cuidado extra na deleção e atualização para manter as tabelas sincronizadas.
