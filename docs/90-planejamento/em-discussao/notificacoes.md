---
id: planejamento-notificacoes
title: "Sistema de Notificações"
description: "Planejamento para implementação de alertas push, notificações in-app e badging para uma experiência de engajamento proativo e onipresente."
audience: ["dev", "ops", "produto"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "notificações", "push", "websocket"]
mvp: false
createdAt: "2026-02-03"
---

# Planejamento: Sistema de Notificações (Omnichannel Engagement)

## 📝 Contexto e Problema

- **Cenário Atual**: O Dindinho é reativo. O usuário precisa abrir o app deliberadamente para verificar o status de suas finanças, efetivação de transações recorrentes ou convites pendentes. Não há comunicação proativa.
- **Por que agora?**: Para alcançar o pilar de **Onipresença**, o sistema deve "viver" além da aba aberta do navegador. Notificações são o tecido conjuntivo que mantém o usuário informado sobre eventos críticos sem exigir esforço de consulta manual. Este planejamento assume a existência da infraestrutura básica de PWA (Service Worker) para funcionamento em background.

## 🔗 Dependências e Interoperabilidade

- **PWA Foundation**: Utiliza o Service Worker configurado no [PWA Full Experience](./pwa-full.md) para gerenciar eventos de `push`.
- **Shared APIs**: Consome as APIs de Hardware (Vibration e Badging) disponibilizadas pela camada de PWA.

## 🚀 Proposta de Solução

- **Visão Geral**: Implementar um motor de notificações robusto e escalável que suporte múltiplos canais, garantindo que a informação certa chegue ao usuário no momento certo.
- **Diferenciais Magistrais**:
  1.  **Sincronização In-App (Real-time)**: Notificações que aparecem instantaneamente sem refresh (via WebSockets).
  2.  **Web Push (Background)**: Capacidade de alertar o usuário mesmo com o navegador/app fechado.
  3.  **Badging API**: Atualização dinâmica do contador de notificações no ícone do PWA.
  4.  **Preferências Granulares**: Controle total do usuário sobre _o que_ e _por onde_ quer ser notificado.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Fundação e Mensageria Real-time

- [ ] **Modelagem de Dados**: Criar tabela `Notification` e `NotificationPreference` no Prisma.
- [ ] **Infraestrutura WebSocket**: Configurar Socket.io no backend (Fastify) com suporte a namespaces por usuário.
- [ ] **Componente de Notificações**: Implementar o "Notification Center" no Header do PWA com suporte a estados (lida/não lida).
- **Critérios de Aceite**: Usuário recebe um alerta visual imediato ao receber um convite ou ter uma transação confirmada enquanto o app está aberto.

### Fase 2: Web Push e Service Workers

- [ ] **VAPID Keys**: Gerar e configurar chaves de segurança para Web Push.
- [ ] **Registro de Subscription**: Implementar fluxo no frontend para solicitar permissão e salvar o endpoint de push no banco.
- [ ] **Worker de Notificações**: Criar um processo background (BullMQ ou similar) para processar e enviar as notificações via FCM ou Web Push nativo.
- **Critérios de Aceite**: Usuário recebe uma notificação push no sistema operacional (Android/Windows/macOS) mesmo com o app fechado.

### Fase 3: Regras de Negócio e Agendamentos

- [ ] **Alerta de Vencimento**: Implementar cron job que verifica transações pendentes a vencer em 24h/48h.
- [ ] **Notificações de Sistema**: Alertas de manutenção, atualizações de termos ou segurança.
- [ ] **Smart Badging**: Integrar com a Badging API (provida pelo PWA) para sincronizar o contador de pendências no ícone com o estado do banco de dados.
- **Critérios de Aceite**: O ícone do app reflete fielmente o número de notificações não lidas e alertas de faturas chegam pontualmente.

### Fase 4: UX de Preferências e Polimento

- [ ] **Central de Preferências**: Tela dedicada para o usuário silenciar canais ou tipos específicos de alertas.
- [ ] **Deep Linking**: Garantir que clicar na notificação leve o usuário exatamente para a tela relevante (ex: detalhe da transação).
- [ ] **Sons e Vibração**: Configurar vibração (via Vibration API do PWA) para alertas de alta prioridade.
- **Critérios de Aceite**: Experiência de configuração fluida e navegação precisa via notificações.

## 🏗️ Impacto Técnico

- **Banco de Dados**:
  - Nova tabela `Notification` (id, userId, title, message, type, readAt, link).
  - Nova tabela `NotificationPreference` (userId, type, channel, enabled).
- **Backend**:
  - Integração com Socket.io para entrega real-time.
  - Serviço de envio de Web Push (biblioteca `web-push`).
  - Background workers para processamento assíncrono.
- **Frontend**:
  - Atualização do Service Worker para escutar eventos `push`.
  - Gerenciamento de estado global para notificações não lidas.
  - Implementação de `Badging API` e `Vibration API`.

## ✅ Definição de Pronto (DoD)

- [ ] Fluxo completo (Backend -> Push -> Frontend) testado em ambiente de staging.
- [ ] Permissões de notificação tratadas graciosamente (fallback se o usuário negar).
- [ ] Payload de push otimizado (respeitando limites de tamanho dos navegadores).
- [ ] Documentação de arquitetura do serviço de notificações atualizada.
- [ ] Testes de integração para os triggers de notificação no domínio de transações.
