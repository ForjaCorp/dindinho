---
id: frontend-standards
title: "Padrões de Frontend"
description: "Guia técnico sobre Angular, Signals, PrimeNG e gerenciamento de estado no Dindinho."
audience: ["dev"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["frontend", "angular", "signals", "primeng", "tailwind"]
mvp: true
createdAt: "2026-02-05"
---

# Padrões de Frontend 🎨

O frontend do Dindinho é construído com **Angular 21+**, utilizando as APIs mais modernas do framework para garantir performance, tipagem estrita e uma experiência de desenvolvimento fluida.

## Angular Moderno

Seguimos as recomendações de "Modern Angular":

- **Componentes Standalone:** Não utilizamos `NgModules`. Todos os componentes, pipes e diretivas são standalone.
- **Control Flow Nativo:** Usamos as novas sintaxes `@if`, `@for` e `@switch` para melhor legibilidade e performance de build.
- **Lazy Loading:** Todas as rotas de página são carregadas via `loadComponent`.

## Gerenciamento de Estado com Signals

Signals são a fundação da nossa reatividade.

- **Preferência por `input()` e `output()`:** Substituímos os decorators `@Input()` e `@Output()` pelas novas funções baseadas em Signals.
- **Estado Derivado:** Usamos `computed()` extensivamente para transformar dados de forma eficiente.
- **Imutabilidade:** Evitamos `mutate()`. Sempre usamos `set()` ou `update()` para garantir previsibilidade.
- **Evite Side Effects:** O uso de `effect()` deve ser limitado a integrações com APIs externas ou logging.

## UI e Estilização

- **PrimeNG v21+:** Utilizamos a nova versão que remove a dependência de animações JS pesadas em favor de animações nativas em CSS.
- **Tailwind CSS:** Para utilitários de layout e ajustes finos. Seguimos a convenção de não misturar Tailwind com CSS tradicional no mesmo elemento.
- **Acessibilidade:** Componentes devem ser navegáveis via teclado e passar em testes de contraste WCAG AA.

## Otimização

- **Imagens:** Use sempre `NgOptimizedImage` para garantir carregamento prioritário e redimensionamento automático.
- **Change Detection:** Usamos `OnPush` em todos os componentes para minimizar ciclos de detecção de mudanças.

---

**Dica de Performance:**

> Mantenha os componentes pequenos e focados. Se um Signal mudar e muitos elementos forem recalculados, considere quebrar em sub-componentes.
