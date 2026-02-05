---
id: adr
title: "Decision Records (ADR)"
description: "Introdução aos Architectural Decision Records do ecossistema Dindinho."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "decisões", "técnico"]
mvp: true
createdAt: "2026-02-04"
---

# Architectural Decision Records (ADR)

Este diretório contém os registros de decisões arquiteturais do projeto Dindinho.

## O que é um ADR?

Um Architectural Decision Record (ADR) é um documento curto (estilo blog post) que captura uma decisão de design significativa, incluindo o contexto em que foi tomada e as consequências que derivam dela.

## Por que usamos ADRs?

- **Contexto Histórico:** Entender o "porquê" de certas escolhas meses depois.
- **Onboarding:** Ajudar novos desenvolvedores a entenderem a evolução técnica.
- **Alinhamento:** Garantir que decisões críticas sejam documentadas e compartilhadas.

## Registros de Decisão

- [ADR 0001: Uso de Angular Signals](./0001-uso-signals.md)
- [ADR 0002: Monorepo e Schemas Zod](./0002-monorepo-zod-schemas.md)
- [ADR 0003: Estratégia Docs-as-Code](./0003-docs-as-code.md)
- [ADR 0004: Padronização de Nomenclatura e Commits](./0004-padronizacao-nomenclatura-commits.md)
- [ADR 0005: Estratégia de Parcelamento via Explosão de Parcelas](./0005-estratégia-parcelamento-explosão.md)
- [ADR 0006: Sincronização Unidirecional de Estado via URL](./0006-sincronização-estado-url.md)
- [ADR 0007: Adoção de Componentes Standalone (Angular)](./0007-componentes-standalone.md)
- [ADR 0008: Estratégia de Testes e Uso de data-testid](./0008-estratégia-testes-data-testid.md)
- [ADR 0009: Uso de Animações Nativas CSS (PrimeNG v21+)](./0009-animações-nativas-css.md)
- [ADR 0010: Modelagem de Dados via Tabela de Extensão](./0010-modelagem-tabela-extensão.md)
- [ADR 0011: Estratégia de Autenticação (JWT + Refresh Token)](./0011-autenticação-jwt-refresh-token.md)
- [ADR 0012: Infraestrutura Imutável via Docker e Coolify](./0012-infraestrutura-docker-coolify.md)
