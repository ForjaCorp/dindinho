---
id: architecture
title: "Arquitetura do Sistema"
description: "Visão geral da arquitetura técnica do ecossistema Dindinho, incluindo serviços, infraestrutura e padrões de comunicação."
audience: ["dev", "arquitetura", "ops"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "técnico", "visão-geral"]
mvp: true
createdAt: "2026-02-04"
---

# Arquitetura do Sistema

O Dindinho é construído seguindo uma arquitetura de monorepo moderna, priorizando a consistência de tipos e a facilidade de deploy.

## Visão Geral

- **Frontend:** Angular (PWA) com foco em reatividade (Signals) e Tailwind CSS.
- **Backend:** Node.js com Fastify, Prisma ORM e PostgreSQL.
- **Shared:** Pacotes Zod compartilhados para validação e tipagem ponta-a-ponta.

## Pilares Técnicos

1. **Type Safety:** Uso extensivo de TypeScript e Zod.
2. **Reatividade:** Angular Signals no frontend.
3. **Contratos:** OpenAPI 3.0 para documentação e comunicação de API.
