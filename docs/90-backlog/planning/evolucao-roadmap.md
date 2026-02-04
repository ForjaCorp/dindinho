---
id: evolucao-roadmap
title: "Roadmap de Evolução e Backlog"
description: "Planejamento de longo prazo para novas funcionalidades, melhorias de infraestrutura e expansão do ecossistema Dindinho."
audience: ["dev", "product", "ops"]
visibility: "internal"
status: "draft"
owners: ["engineering", "product"]
tags: ["roadmap", "planning", "backlog", "future"]
mvp: false
createdAt: "2026-02-03"
---

# 🚀 Roadmap de Evolução

Este documento centraliza as futuras expansões do Dindinho, detalhando arquitetura, casos de uso e impactos esperados para cada grande iniciativa.

## 📱 Mobile & PWA

### 1. PWA Full (Progressive Web App)

- **Descrição**: Transformar a aplicação Angular em um PWA completo com suporte a offline e instalação.
- **Arquitetura**: Implementação de Service Workers (@angular/pwa), manifesto de app e estratégia de cache.
- **Impacto**: Melhora o engajamento do usuário e permite o uso básico sem conexão estável.

### 2. App Nativo (Android/iOS)

- **Descrição**: Gerar builds nativos a partir do código Angular.
- **Arquitetura**: Utilização de **Capacitor** ou **Cordova** para bridge nativa.
- **Impacto**: Presença nas lojas (Play Store/App Store) e acesso a APIs de hardware mais profundas.

## 🔐 Autenticação & Segurança

### 3. Login OAuth (Social Login)

- **Descrição**: Permitir login via Google, Apple e Github.
- **Arquitetura**: Integração no backend (Fastify) com Passport ou biblioteca de OAuth2. Fluxo de "linkar contas" existentes.
- **Impacto**: Reduz a fricção no onboarding de novos usuários.

### 4. Termos de Privacidade e LGPD

- **Descrição**: Criação de termos reais, política de cookies e mecanismos de exportação/exclusão de dados.
- **Arquitetura**: Tabela de consentimento no banco, endpoints para GDPR/LGPD compliance.
- **Impacto**: Segurança jurídica e conformidade com leis de proteção de dados.

## 💰 Negócio & Personalização

### 5. Precificação e Planos

- **Descrição**: Definição de níveis de serviço (Free, Premium, Family).
- **Arquitetura**: Implementação de `SubscriptionService`, integração com gateways de pagamento (Stripe/Asaas) e middleware de limites (ex: "máximo 3 contas no plano free").
- **Impacto**: Monetização do projeto.

### 6. Personalização do App

- **Descrição**: Temas (Dark Mode), customização de ícones de categorias e layout do dashboard.
- **Arquitetura**: CSS Variables reativas via Angular Signals e persistência de preferências do usuário no banco.
- **Impacto**: Melhora a retenção e satisfação do usuário.

## 🤖 Notificações Inteligentes

### 7. Filtro de Transações por Notificações

- **Descrição**: Ler notificações do dispositivo (via App Nativo) e identificar transações de apps bancários/cartões.
- **Arquitetura**: No Android, uso de `NotificationListenerService`. No backend, motor de Regex/IA para extrair valor e categoria da string da notificação.
- **Impacto**: **Funcionalidade matadora.** Automatiza a entrada de dados que é o maior gargalo de apps financeiros.

### 8. Backlog Técnico de Notificações

- **Descrição**: Refinar as definições técnicas de quando e como notificar o usuário (push vs in-app).
- **Arquitetura**: Fila de mensagens (Redis/BullMQ) para processamento assíncrono de notificações de limites atingidos.
- **Impacto**: Reduz ruído e aumenta a utilidade das notificações.

## 🔗 Links Relacionados

- [Visão Geral do Produto](file:///home/vinicius/dev/dindinho/docs/00-overview/principles.md)
- [Arquitetura Atual](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/documentation.md)
