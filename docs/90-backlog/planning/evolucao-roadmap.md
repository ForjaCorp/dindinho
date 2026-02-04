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

## 🏁 Itens em Andamento / Curto Prazo (MVP)

Estes itens já possuem planejamento iniciado ou são essenciais para o fechamento do MVP.

### 1. Sistema de Convites (Colaboração)

- **Status**: [Pendente](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/sistema-convites.md)
- **Foco**: Fluxo de e-mail para compartilhar múltiplas contas com permissões (Viewer/Editor/Admin).

### 2. Metas de Economia Híbridas

- **Status**: [Em Andamento](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/planejamento-metas.md)
- **Foco**: Implementação do motor de cálculo para Limites de Gastos e Objetivos de Poupança.

### 3. Evolução de Roteamento e API

- **Status**: [Pendente](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/ROUTING_EVOLUTION_PLAN.md)
- **Foco**: Padronização de slugs, versionamento de API e melhorias na navegação do portal.

## 📱 Mobile & PWA

### 4. PWA Full (Progressive Web App)

- **Descrição**: Transformar a aplicação Angular em um PWA completo com suporte a offline e instalação.
- **Arquitetura**: Implementação de Service Workers (@angular/pwa), manifesto de app e estratégia de cache.
- **Impacto**: Melhora o engajamento do usuário e permite o uso básico sem conexão estável.

### 5. App Nativo (Android/iOS)

- **Descrição**: Gerar builds nativos a partir do código Angular.
- **Arquitetura**: Utilização de **Capacitor** ou **Cordova** para bridge nativa.
- **Impacto**: Presença nas lojas (Play Store/App Store) e acesso a APIs de hardware mais profundas.

## 🔐 Autenticação & Segurança

### 6. Login OAuth (Social Login)

- **Descrição**: Permitir login via Google, Apple e Facebook.
- **Arquitetura**: Integração no backend (Fastify) com Passport ou biblioteca de OAuth2. Fluxo de "linkar contas" existentes.
- **Impacto**: Reduz a fricção no onboarding de novos usuários.

### 7. Termos de Privacidade e LGPD

- **Descrição**: Criação de termos reais, política de cookies e mecanismos de exportação/exclusão de dados.
- **Arquitetura**: Tabela de consentimento no banco, endpoints para GDPR/LGPD compliance.
- **Impacto**: Segurança jurídica e conformidade com leis de proteção de dados.

## 💰 Negócio & Onboarding

### 8. Landing Page de Alta Conversão

- **Descrição**: Site institucional focado em vendas, SEO e apresentação do mascote Dindinho.
- **Arquitetura**: SSR (Server Side Rendering) com Angular ou framework estático para máxima performance.
- **Impacto**: Atração orgânica de usuários e autoridade de marca.

### 9. Onboarding de Alta Conversão

- **Descrição**: Fluxo inicial de configuração guiado, rápido e visualmente atraente.
- **Arquitetura**: Componentes de step-by-step com persistência de progresso e tracking de drop-off.
- **Impacto**: Redução de abandono logo após o registro.

### 10. Precificação e Compras In-app

- **Descrição**: Níveis de serviço (Free/Premium/Family) com suporte a assinaturas e compras de itens cosméticos.
- **Arquitetura**: Integração com Stripe/Asaas (Web) e In-App Purchases (iOS/Android via Capacitor).
- **Impacto**: Monetização mantendo a proposta Ad-free.

## 🦖 Experiência & Gamificação (O Mascote Dindinho)

### 11. Dindinho Personalizável

- **Descrição**: O mascote dinossauro que acompanha o usuário. Customização de cores, acessórios (skins) e evolução visual.
- **Arquitetura**: Sistema de camadas de imagem ou modelos 3D leves. Preferências salvas como metadados do perfil.
- **Impacto**: Diferenciação de mercado, conexão emocional e retenção.

### 12. Metas Gamificadas

- **Descrição**: Bater metas de economia faz o Dindinho crescer, ganhar itens ou desbloquear novas cores de app.
- **Arquitetura**: Hook no motor de cálculo de metas para disparar eventos de "level up".
- **Impacto**: Gamificação real do comportamento financeiro sem incentivar metas falsas (necessita validação de transações).

## 🤖 IA & Integrações Externas

### 13. Agente Financeiro WhatsApp (Dindinho Zap)

- **Descrição**: Assistente via WhatsApp para cadastrar transações, consultar saldo e pedir resumos usando linguagem natural.
- **Arquitetura**: Fork/Integração com agente externo. Uso de Webhooks do WhatsApp Business API conectando ao backend do Dindinho.
- **Impacto**: **Onipresença.** O usuário gerencia seu financeiro sem abrir o app, aumentando drasticamente a frequência de uso.

### 14. Filtro de Transações por Notificações

- **Descrição**: Ler notificações do dispositivo (via App Nativo) e identificar transações de apps bancários/cartões.
- **Arquitetura**: No Android, uso de `NotificationListenerService`. No backend, motor de Regex/IA para extrair valor e categoria da string da notificação.
- **Impacto**: Automatização total da entrada de dados.

### 15. Backlog Técnico de Notificações

- **Descrição**: Refinar as definições técnicas de quando e como notificar o usuário (push vs in-app).
- **Arquitetura**: Fila de mensagens (Redis/BullMQ).
- **Impacto**: Utilidade e engajamento.

## 🔗 Links Relacionados

- [Visão Geral do Produto](file:///home/vinicius/dev/dindinho/docs/00-overview/principles.md)
- [Arquitetura Atual](file:///home/vinicius/dev/dindinho/docs/90-backlog/planning/documentation.md)
