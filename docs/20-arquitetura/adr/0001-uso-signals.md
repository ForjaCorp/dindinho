---
id: adr-0001-uso-signals
title: "ADR 0001: Uso de Angular Signals para Gerenciamento de Estado"
description: "Decisão de adotar Angular Signals como o padrão primário de reatividade e gerenciamento de estado no frontend."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "angular", "signals", "reatividade"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0001: Uso de Angular Signals para Gerenciamento de Estado

## Status

Aceito (Implementado)

## Contexto

Tradicionalmente, aplicações Angular utilizam `RxJS` (através de `BehaviorSubject` e o pipe `async`) para gerenciamento de estado e reatividade. Embora poderoso, o RxJS pode introduzir complexidade desnecessária para estados simples, dificuldades com detecção de mudanças (Change Detection) e problemas de performance se não for bem gerenciado (ex: excesso de zone.js turns).

O Dindinho, sendo um PWA que busca alta performance e uma experiência de usuário fluida, necessita de uma forma mais granular e eficiente de reagir a mudanças de dados.

## Decisão

Adotamos **Angular Signals** como o padrão primário para gerenciamento de estado no frontend.

1.  **Estado Local:** Todos os componentes devem usar `signal()` para variáveis reativas internas.
2.  **Estado Derivado:** Usar `computed()` para valores que dependem de outros signals, garantindo memorização e execução preguiçosa (lazy).
3.  **Efeitos:** Usar `effect()` para operações colaterais (side-effects) que dependem de mudanças de estado (ex: logs, chamadas externas que não retornam dados para o template).
4.  **Integração com RxJS:** O RxJS continua sendo usado para fluxos assíncronos complexos e eventos (como chamadas HTTP via `HttpClient`), mas deve ser convertido para Signals o mais cedo possível usando `toSignal()`.
5.  **Change Detection:** Utilizar `changeDetection: ChangeDetectionStrategy.OnPush` em todos os componentes, permitindo que o Angular otimize a renderização baseada apenas nas mudanças de Signals.

## Consequências

### Positivas

- **Performance Granular:** O Angular consegue rastrear exatamente quais partes do template precisam ser atualizadas sem disparar um ciclo global de detecção de mudanças.
- **Simplicidade de Código:** Código mais legível e síncrono para lógica de UI, reduzindo o "boilerplate" do RxJS.
- **Previsibilidade:** O fluxo de dados se torna mais claro e menos propenso a vazamentos de memória (Signals não requerem subscrições manuais).

### Negativas / Desafios

- **Curva de Aprendizado:** Desenvolvedores acostumados puramente com RxJS precisam se adaptar ao novo paradigma.
- **Interoperabilidade:** Necessidade de gerenciar a ponte entre Observables e Signals (resolvido via `@angular/core/rxjs-interop`).
