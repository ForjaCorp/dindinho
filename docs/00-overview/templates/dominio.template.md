---
id: template-dominio
title: "Título do Domínio"
description: "Breve descrição do propósito deste domínio no sistema (max 280 caracteres)."
audience: ["dev", "user"]
visibility: "public"
status: "draft"
owners: ["engineering"]
tags: ["dominio", "template"]
mvp: true
createdAt: "2026-02-03"
---

# Título do Domínio

Breve introdução sobre o que este domínio resolve para o usuário e para o negócio.

## 🎯 Objetivo

- O que o usuário consegue realizar?
- Qual a dor de negócio que isso resolve?

## 👥 Visão do Usuário (User Guide)

_Esta seção é voltada para o **Tier de Usuário** (docs/user/_). Foque em UX e fluxos de uso.\*

### Fluxos Principais

1. **Ação A**: Passo a passo resumido.
2. **Ação B**: Como visualizar resultados.

### Interface (PWA)

- Componentes principais envolvidos.
- Comportamentos esperados (ex: reatividade, animações).

## 🛠️ Visão Técnica (Admin/Engineering)

_Esta seção é voltada para o **Tier Admin** (docs/admin/_). Foque em arquitetura, banco e API.\*

### Modelo de Dados

- **Tabelas/Coleções**: Referência ao schema do Prisma.
- **Invariantes**: Regras que nunca podem ser quebradas.

### Integração e API

- **Endpoints**: Links para a [Referência de API](../../30-api/openapi.json).
- **Contratos**: Referência aos schemas em `@dindinho/shared`.

## 🔗 Links Úteis

- [Link Relacionado](../../../README.md)
- [RFC/Planejamento](../../90-backlog/planning/documentation.md)
