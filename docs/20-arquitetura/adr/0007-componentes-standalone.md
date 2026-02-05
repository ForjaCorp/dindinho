---
id: adr-0007-componentes-standalone
title: "ADR 0007: Adoção de Componentes Standalone (Angular)"
description: "Decisão de utilizar componentes standalone como unidade básica de construção no Angular, eliminando a dependência de NgModules."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "frontend", "angular"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0007: Adoção de Componentes Standalone (Angular)

## Status

**Aceito** (Estável)

## Contexto

Tradicionalmente, aplicações Angular eram organizadas em `NgModules`, o que frequentemente levava a arquiteturas complexas, "módulos compartilhados" gigantescos e dificuldades no tree-shaking e lazy loading. Com o lançamento das APIs standalone no Angular 14+, tornou-se possível criar componentes, diretivas e pipes que gerenciam suas próprias dependências.

## Decisão

Adotamos o padrão **Standalone Only** para todo o desenvolvimento frontend do Dindinho:

1.  **Componentes:** Todos os componentes devem ter `standalone: true`.
2.  **Bootstrap:** A aplicação é inicializada usando `bootstrapApplication` em vez de `platformBrowserDynamic().bootstrapModule()`.
3.  **Roteamento:** Utilizamos `loadComponent` em vez de `loadChildren` para lazy loading de páginas individuais, simplificando a árvore de rotas.
4.  **Dependências:** As dependências (outros componentes, módulos de terceiros, pipes) são importadas diretamente no array `imports` do decorator `@Component`.

## Consequências

### Prós

- **Simplicidade:** Redução do boilerplate ao eliminar a necessidade de declarar componentes em módulos.
- **Lazy Loading Granular:** Facilita o carregamento sob demanda de componentes específicos, melhorando o tempo de carregamento inicial.
- **Desenvolvimento Modular:** Componentes tornam-se unidades mais independentes e fáceis de testar isoladamente.
- **Alinhamento com o Futuro:** O ecossistema Angular está convergindo para o modelo standalone.

### Contras

- **Verbocidade no Decorator:** O array `imports` em cada componente pode crescer, mas isso é mitigado pela clareza de saber exatamente o que o componente utiliza.
- **Curva de Aprendizado:** Desenvolvedores acostumados estritamente com `NgModules` precisam se adaptar ao novo fluxo de injeção de dependências e imports.
