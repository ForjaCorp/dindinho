---
id: pwa-full-experience
title: "PWA Full (Progressive Web App)"
description: "Transformação do Dindinho em uma experiência mobile completa através de tecnologias PWA, incluindo suporte offline, instalação e performance aprimorada."
audience: ["dev", "ux"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "pwa", "mobile", "offline"]
mvp: false
createdAt: "2026-02-06"
---

# Planejamento: PWA Full (Progressive Web App)

## 📝 Contexto e Problema

- **Cenário Atual**: O Dindinho é acessível via navegador mobile, mas não oferece uma experiência de "aplicativo real". Depende de conexão constante e não possui presença na home screen do usuário de forma nativa.
- **Por que agora?**: O pilar de **Onipresença** exige que o app esteja disponível onde o usuário está. O PWA é a forma mais eficiente de entregar uma experiência mobile-first sem a complexidade de lojas (App Store/Play Store) neste estágio.

## 🚀 Proposta de Solução

- **Visão Geral**: Implementar o pacote `@angular/pwa` para habilitar Service Workers, Manifesto de App e estratégias de cache inteligente.
- **Estratégias de Cache**:
  1.  **Assets Estáticos**: Cache first (shell do app).
  2.  **Dados da API**: Network first com fallback para cache (visualização offline de saldos e transações recentes).
- **Instalabilidade**: Configurar manifesto com ícones, cores de tema e splash screens para que o app seja "instalável" no Android e iOS.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Fundação PWA e Manifesto

- [ ] Instalar e configurar `@angular/pwa`.
- [ ] Criar ícones em todas as resoluções necessárias (192x192, 512x512).
- [ ] Configurar `manifest.webmanifest` com nome, cores e modo `standalone`.
- **Critérios de Aceite**: App reconhecido como instalável pelo Chrome/Safari e Lighthouse score de PWA acima de 90.

### Fase 2: Service Worker e Offline Shell

- [ ] Configurar `ngsw-config.json` para cache de fontes, ícones PrimeNG e assets.
- [ ] Implementar detecção de nova versão do app com aviso de "Recarregar".
- **Critérios de Aceite**: App carrega instantaneamente em acessos subsequentes, mesmo com rede lenta.

### Fase 3: Dados Offline (Read-only)

- [ ] Implementar cache de dados da API para rotas principais (`/dashboard`, `/accounts`).
- [ ] Adicionar indicador visual de "Modo Offline" na UI.
- **Critérios de Aceite**: Usuário consegue abrir o dashboard e ver seu saldo atual mesmo sem internet.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Nenhuma mudança.
- **API**: Nenhuma mudança necessária (Service Worker lida com o proxy de rede).
- **Frontend**: Adição de Service Workers, manifesto e lógica de sincronização offline.

## ✅ Definição de Pronto (DoD)

- [ ] Testado em dispositivos Android (Chrome) e iOS (Safari).
- [ ] Validação de instalação bem-sucedida.
- [ ] Performance auditada via Lighthouse.
- [ ] Documentação de "Como Instalar" criada para o usuário final.
