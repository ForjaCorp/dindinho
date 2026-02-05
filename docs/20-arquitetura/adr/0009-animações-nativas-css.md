---
id: adr-0009-animações-nativas-css
title: "ADR 0009: Uso de Animações Nativas CSS (PrimeNG v21+)"
description: "Decisão de abandonar o módulo legatário de animações do Angular em favor das animações nativas de CSS gerenciadas pelo PrimeNG v21+."
audience: ["dev", "frontend"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "frontend", "angular", "primeng", "performance"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0009: Uso de Animações Nativas CSS (PrimeNG v21+)

## Status

**Aceito** (Estável)

## Contexto

O Angular tradicionalmente utiliza o `@angular/animations` (Web Animations API), que exige a inclusão de provedores como `provideAnimations()` ou `provideAnimationsAsync()`. No entanto, o PrimeNG v21+ migrou sua arquitetura para utilizar animações nativas de CSS, que são mais leves e performáticas em dispositivos móveis.

## Decisão

Para otimizar o bundle size e a performance no Dindinho:

1.  **Não utilizar** `provideAnimations()` ou `provideAnimationsAsync()` no `app.config.ts`.
2.  **Confiar no PrimeNG:** As animações de diálogos, menus e overlays serão gerenciadas internamente pelo PrimeNG via CSS.
3.  **Animações Customizadas:** Para animações próprias, devemos preferir CSS puro (transitions/animations) ou as novas APIs de animação de entrada/saída de elementos nativas do navegador.

## Consequências

### Prós

- **Performance:** Menor overhead de JavaScript, delegando o trabalho de animação para o motor de renderização do navegador.
- **Bundle Size:** Redução do tamanho final do pacote ao remover as dependências do módulo de animações do Angular.
- **Simplicidade:** Menos configurações globais no setup da aplicação.

### Contras

- **Compatibilidade:** Algumas bibliotecas legadas de terceiros podem exigir explicitamente o provedor de animações do Angular.
- **Flexibilidade Limitada:** Animações complexas baseadas em estado que eram fáceis com Angular Animations podem exigir mais esforço para serem implementadas puramente em CSS.
