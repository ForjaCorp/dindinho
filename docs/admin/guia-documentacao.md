---
id: guia-documentacao
title: "Guia de Documentação"
description: "Padrões, estrutura e diretrizes para criar e manter a documentação do ecossistema Dindinho."
audience: ["dev", "arquitetura", "ops"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["documentação", "guia", "padrões", "interno"]
mvp: true
createdAt: "2026-02-05"
---

# Guia de Documentação 📚

Este guia define os padrões e processos para garantir que a documentação do Dindinho permaneça útil, atualizada e fácil de navegar.

## Princípios

- **Documentação como Código:** Docs residem no monorepo e seguem o mesmo fluxo de PRs.
- **PT-BR por Padrão:** Todo o conteúdo textual deve ser escrito em Português do Brasil.
- **Single Source of Truth:** Evite duplicar informações; prefira links para a fonte original (ex: código, contratos Zod).
- **Acessibilidade:** Use cabeçalhos lógicos e texto alternativo para imagens.

## Estrutura de Pastas (`/docs`)

A estrutura é organizada por domínios e ciclos de vida:

- `00-geral/`: Visão geral do produto e princípios.
- `10-produto/`: Requisitos, regras de negócio e fluxos de usuário.
- `20-arquitetura/`: Desenho técnico, diagramas e infraestrutura.
- `20-arquitetura/adr/`: _Architecture Decision Records_ (Decisões arquiteturais).
- `30-api/`: Contratos e especificações técnicas (OpenAPI).
- `40-plataformas/`: Documentação específica de cada cliente (PWA, etc).
- `50-operacoes/`: Guias de deploy, monitoramento e incidentes.
- `90-planejamento/`: Planos de execução e histórico de projetos.

## Metadados (Frontmatter)

Todo arquivo `.md` deve começar com um bloco de metadados YAML:

```yaml
---
id: identificador-unico
title: "Título da Página"
description: "Breve resumo do conteúdo"
audience: ["dev", "ops", "produto"]
visibility: "interno" | "público"
status: "rascunho" | "em-progresso" | "estável"
owners: ["engineering"]
tags: ["tag1", "tag2"]
createdAt: "YYYY-MM-DD"
---
```

## Links SPA no Frontend

Para manter a navegação fluida (sem recarregamento), use links relativos com extensão `.md`. O portal de documentação intercepta esses links e os converte em rotas SPA:

- **Correto:** `[Veja os Princípios](../00-geral/principios.md)`
- **Evitar:** `[Veja os Princípios](../00-geral/principios.md)` (quebra a visualização nativa no GitHub)

## Referência de API

A documentação da API é gerada automaticamente a partir da especificação OpenAPI.

- **Portal**: [Visualizar Referência de API](/docs/api-ref)
- **GitHub**: [openapi.json](../30-api/openapi.json) (No portal, este link também abrirá a referência interativa)
- **Swagger**: [Abrir Interface Interativa](/docs/swagger)

## Governança

1. **Revisão:** Toda mudança em contrato de API deve vir acompanhada da atualização da doc correspondente.
2. **Qualidade:** Rode `npm run docs:check` no frontend para validar links quebrados e metadados.
3. **Propriedade:** Cada documento tem um `owner` responsável pela sua precisão.
