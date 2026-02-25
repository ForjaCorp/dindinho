---
id: planejamento-pwa
title: "PWA Full (Progressive Web App)"
description: "Transformação do Dindinho em uma experiência mobile completa através de tecnologias PWA, incluindo suporte offline, instalação e performance aprimorada."
audience: ["dev", "produto", "usuário", "arquitetura"]
visibility: "interno"
status: "em-discussao"
owners: ["engineering"]
tags: ["planejamento", "rfc", "pwa", "mobile", "offline"]
mvp: false
createdAt: "2026-02-06"
---

# Planejamento: PWA Full (Magistral Mobile Experience)

## 📝 Contexto e Problema

- **Cenário Atual**: O Dindinho é acessível via navegador mobile, mas não oferece uma experiência de "aplicativo real". Depende de conexão constante e não possui presença na home screen do usuário de forma nativa.
- **Por que agora?**: Como a publicação em lojas nativas (App Store/Play Store) é um objetivo de longo prazo, o PWA deve entregar uma **experiência magistral** que neutralize a necessidade de um app nativo imediato. O pilar de **Onipresença** exige fluidez, integração com o SO e funcionamento offline impecável.

## 🚀 Proposta de Solução

- **Visão Geral**: Transformar o Dindinho em uma aplicação PWA de elite, utilizando APIs modernas do navegador para mimetizar o comportamento nativo (Look & Feel, Gestos e Integrações).
- **Diferenciais Magistrais**:
  1.  **App Shell Instantâneo**: Carregamento sub-segundo via Service Workers.
  2.  **Integração com SO**: Web Share API, suporte à Badging API e App Shortcuts.
  3.  **UX Nativa**: Scroll elástico, haptic feedback (vibração em ações de UI) e transições de página fluidas.
  4.  **Sincronização em Segundo Plano**: Background Sync API para garantir que transações feitas offline sejam enviadas assim que a rede retornar.

## 📅 Cronograma de Execução (Fases)

### Fase 1: Fundação e Identidade Visual (Nativa Feel)

- [ ] Instalar e configurar `@angular/pwa`.
- [ ] **Design de Ícones Premium**: Criar ícones adaptativos (maskable icons) e splash screens geradas dinamicamente para iOS/Android.
- [ ] **Configuração do Manifesto**: Definir `display: standalone`, `orientation: portrait` e `theme_color` que se integra à barra de status do sistema.
- [ ] **App Shortcuts**: Adicionar atalhos rápidos no ícone (ex: "Nova Receita", "Nova Despesa").
- **Critérios de Aceite**: App instalável com identidade visual indistinguível de um app nativo.

### Fase 2: Performance e Resiliência (Offline First)

- [ ] **Service Worker Avançado**: Estratégia de `Stale-While-Revalidate` para dados da API.
- [ ] **Background Sync**: Implementar fila de sincronização para transações criadas em modo offline.
- [ ] **Persistência Local**: Usar IndexedDB (via `Dexie.js` ou similar) para cache pesado de transações e categorias.
- **Critérios de Aceite**: 100% de funcionalidade de leitura offline e criação de transações resiliente a quedas de rede.

### Fase 3: Integrações de Hardware e Sistema (Capacidades Técnicas)

- [ ] **Haptic Feedback**: Vibrar levemente ao confirmar uma transação ou encontrar um erro de validação (Vibration API).
- [ ] **Badging API**: Implementar infraestrutura para permitir que o app exiba contadores no ícone (delegando a lógica para módulos de serviço).
- [ ] **Web Share API**: Permitir compartilhar comprovantes de transação ou links de convite usando a folha de compartilhamento nativa do sistema.
- [ ] **Safe Area Insets**: Ajustar o CSS para respeitar notches e barras de navegação (env(safe-area-inset-\*)).
- **Critérios de Aceite**: O app disponibiliza APIs de sistema para uso interno e interage como um cidadão nativo.

### Fase 4: UX e Polimento "Magistral"

- [ ] **Transições de Rota**: Implementar animações de slide entre páginas (estilo iOS/Android).
- [ ] **Pull-to-Refresh**: Implementar gesto de puxar para atualizar nas listagens de transações.
- [ ] **Skeleton Screens**: Substituir loaders genéricos por skeletons que mimetizam a estrutura do conteúdo.
- **Critérios de Aceite**: Navegação fluida a 60fps sem "pulos" de layout.

## 🏗️ Impacto Técnico

- **Banco de Dados**: Nenhuma mudança necessária no servidor.
- **Frontend**:
  - Adição de `IndexedDB` para persistência local.
  - Uso intensivo de APIs de Web Mobile (Vibration, Share, Badging).
  - Refatoração de CSS para suporte a Safe Areas e interações touch.
- **Service Worker**: Lógica customizada para Background Sync.

## 🧪 Testes E2E (Progressive Web App)

Uma vez que o PWA esteja implementado, os testes E2E devem cobrir:

- **Cenário**: Simular modo offline via Playwright (`page.offline()`), adicionar uma transação e depois voltar a ficar online.
- **Validação**: Garantir que o Service Worker cacheou a requisição (Background Sync) e sincronizou com o backend assim que a conectividade foi restaurada.
- **Técnico**: Validar se o `manifest.json` está sendo servido corretamente e se o Service Worker está registrado e ativo.
- **Identidade**: Verificar se as meta tags de `theme-color` e as `safe-area-insets` estão presentes no DOM.

## ✅ Definição de Pronto (DoD)

- [ ] Testado exaustivamente em iOS (Safari/PWA) e Android (Chrome/PWA).
- [ ] Pontuação Lighthouse PWA: 100/100.
- [ ] Funcionalidade "Offline Mode" validada (Criação de transação sem rede).
- [ ] Feedback tátil (vibração) funcionando em dispositivos compatíveis.
