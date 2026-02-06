---
id: adr-0005-estratégia-parcelamento-explosão
title: "ADR 0005: Estratégia de Parcelamento via Explosão de Parcelas"
description: "Decisão de gerar registros individuais no banco de dados para cada parcela de uma transação recorrente ou parcelada."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "banco-de-dados", "performance", "finanças"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0005: Estratégia de Parcelamento via Explosão de Parcelas

## Status

Aceito (Implementado)

## Contexto

Sistemas financeiros precisam lidar com transações parceladas (ex: uma compra de R$ 1.200,00 em 12x). Existem duas abordagens principais:

1.  **Cálculo em Tempo de Execução:** Armazenar uma única transação com metadados de parcelamento e calcular as parcelas dinamicamente em cada consulta.
2.  **Explosão de Parcelas:** Gerar N registros individuais no banco de dados no momento da criação.

O Dindinho foca em relatórios mensais rápidos e flexibilidade para editar parcelas específicas (ex: antecipar uma parcela ou mudar o valor de apenas uma delas).

## Decisão

Adotamos a estratégia de **Explosão de Parcelas**.

1.  **Persistência:** Ao registrar uma despesa parcelada, o backend gera imediatamente todos os registros correspondentes no banco de dados.
2.  **Identificação:** Todos os registros de um mesmo grupo de parcelas compartilham um `recurrenceId` (UUID).
3.  **Metadados:** Cada parcela armazena seu número sequencial (ex: "Parcela 2 de 10") para facilitar a exibição.
4.  **Edição:**
    - Edição individual: Afeta apenas o registro selecionado.
    - Edição em lote: O sistema utiliza o `recurrenceId` para aplicar mudanças a "esta e as próximas" ou "todas as parcelas".

## Consequências

### Positivas

- **Performance de Leitura:** Consultas de "Gastos do Mês X" são somas simples (`SUM`) no banco de dados, sem necessidade de lógica complexa de projeção de datas.
- **Flexibilidade:** Permite tratar cada parcela como uma entidade independente para ajustes finos (mudança de categoria em uma parcela específica, etc).
- **Simplicidade no Backend:** A lógica de negócio para relatórios e fluxos de caixa torna-se trivial.

### Negativas / Desafios

- **Volume de Dados:** Ocupa mais espaço no banco de dados (embora insignificante para o volume esperado de uma aplicação pessoal).
- **Consistência em Lote:** Requer cuidado extra para garantir que edições em lote mantenham a integridade do grupo através do `recurrenceId`.
- **Criação Lenta:** O processo de inserção inicial é ligeiramente mais lento por envolver múltiplos registros, mas é uma operação de escrita única que economiza milhares de operações de leitura.
