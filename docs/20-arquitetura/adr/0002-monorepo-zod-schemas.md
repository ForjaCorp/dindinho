---
id: adr-0002-monorepo-zod-schemas
title: "ADR 0002: Monorepo e Compartilhamento de Schemas Zod"
description: "Uso de uma estrutura de monorepo com compartilhamento de contratos de dados entre frontend e backend via Zod."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "monorepo", "zod", "typescript", "contratos"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0002: Monorepo e Compartilhamento de Schemas Zod

## Status

Aceito (Implementado)

## Contexto

A dessincronização entre os modelos de dados do Backend e do Frontend é uma fonte comum de bugs em aplicações web. Tradicionalmente, isso é resolvido duplicando interfaces TypeScript ou gerando código a partir de especificações OpenAPI (que podem ficar desatualizadas).

No Dindinho, queríamos uma garantia de "Type Safety" ponta-a-ponta (End-to-End Type Safety) que fosse fácil de manter e que servisse tanto para validação em tempo de execução quanto para tipagem estática.

## Decisão

1.  **Estrutura de Monorepo:** Utilizamos `npm workspaces` e `Turborepo` para gerenciar os pacotes `frontend`, `backend` e `shared`.
2.  **Zod como Fonte de Verdade:** Definimos todos os contratos de dados (DTOs, Request Bodies, Respostas de API) usando a biblioteca **Zod** no pacote `@dindinho/shared`.
3.  **Compartilhamento de Código:**
    - O **Backend** utiliza os schemas Zod para validar entradas via `ZodTypeProvider` no Fastify.
    - O **Frontend** utiliza os mesmos schemas para validar respostas e derivar tipos TypeScript para seus componentes e serviços.
4.  **OpenAPI Automatizado:** A documentação OpenAPI é gerada dinamicamente no backend a partir dos mesmos schemas Zod, garantindo que a documentação nunca minta sobre o código.

## Consequências

### Positivas

- **Zero Duplicação:** Interfaces e validações são escritas uma única vez.
- **Sincronia Automática:** Se um campo muda no backend, o erro de tipagem aparece imediatamente no frontend durante a compilação.
- **Validação Robusta:** Zod garante que os dados em tempo de execução correspondam exatamente aos tipos esperados.
- **Agilidade:** Menos tempo gasto escrevendo "boilerplate" de interfaces manuais.

### Negativas / Desafios

- **Complexidade de Build:** Requer uma ferramenta de orquestração (Turborepo) para gerenciar dependências entre pacotes.
- **Tamanho do Bundle:** Incluir Zod no frontend adiciona alguns KBs ao bundle, mas o benefício de segurança compensa o custo.
- **Rigidez:** Mudanças estruturais no `@dindinho/shared` requerem recompilação de todo o monorepo.
