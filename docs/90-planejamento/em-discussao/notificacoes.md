---
id: planejamento-notificacoes
title: "Sistema de Notificações"
description: "Planejamento para implementação de alertas push e notificações in-app para eventos financeiros."
audience: ["dev", "ops"]
visibility: "interno"
status: "rascunho"
owners: ["engineering"]
tags: ["planejamento", "rfc", "notificações"]
mvp: false
createdAt: "2026-02-03"
---

# Planejamento: Sistema de Notificações

## 📝 Contexto e Problema

- **Cenário Atual**: O usuário precisa abrir o app para saber se uma transação recorrente foi efetivada ou se o saldo está baixo.
- **Motivação**: Aumentar o engajamento e fornecer valor proativo ao usuário, alertando sobre vencimentos de faturas e limites de gastos.

## 🚀 Proposta de Solução

- Implementação de um serviço central de notificações no backend.
- Suporte inicial para **Notificações In-App** (via WebSockets/SSE) e **Push Notifications** (via Web Push API).
- Integração com o domínio de Transações para disparar alertas baseados em regras.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Infraestrutura Base

- [ ] Criar tabela `Notification` no Prisma.
- [ ] Configurar Socket.io ou SSE no Fastify.
- [ ] Implementar componente de "Sininho" no Header do PWA.
- **Critérios de Aceite**: Usuário recebe uma notificação em tempo real ao realizar uma ação específica no sistema.

### Fase 2: Regras e Agendamentos

- [ ] Implementar worker para verificar transações pendentes/vencendo.
- [ ] Criar tela de "Preferências de Notificação" no perfil do usuário.
- **Critérios de Aceite**: Notificações são disparadas automaticamente 24h antes do vencimento de uma transação.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Nova tabela `Notification` vinculada ao `User`.
- **API**: Novos endpoints `/notifications` (GET, PATCH para marcar como lida).
- **Frontend**: Novo Service Worker para lidar com Web Push em background.

## ✅ Definição de Pronto (DoD)

- [ ] Código testado (unitário/integração).
- [ ] Documentação atualizada (Tier User/Admin).
- [ ] Lint/Typecheck sem erros.
- [ ] Revisado por outro par.
