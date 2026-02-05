---
id: adr-0003-docs-as-code
title: "ADR 0003: Estratégia Docs-as-Code e Portal Integrado"
description: "Implementação da documentação técnica como parte do repositório de código, consumida por um portal interno no frontend."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "documentação", "docs-as-code", "markdown"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0003: Estratégia Docs-as-Code e Portal Integrado

## Status

Aceito (Implementado)

## Contexto

Documentação técnica fora do repositório (ex: Notion, Confluence, Google Docs) tende a ficar desatualizada rapidamente, pois não faz parte do fluxo de trabalho diário dos desenvolvedores. Além disso, o acesso a essas ferramentas externas pode ser burocrático.

## Decisão

Adotamos a estratégia **Docs-as-Code** com as seguintes premissas:

1.  **Localização:** Toda a documentação técnica reside na pasta `/docs` na raiz do monorepo.
2.  **Formato:** Arquivos Markdown (`.md`) com metadados estruturados em YAML (Frontmatter).
3.  **Portal de Docs:** O frontend da aplicação contém uma rota `/docs` que serve como um portal de visualização premium.
    - O portal lê os arquivos Markdown dinamicamente.
    - Suporta busca full-text baseada na estrutura da sidebar.
    - Renderiza especificações OpenAPI integradas.
4.  **Fluxo de Trabalho:** Alterações na documentação devem ser feitas via Pull Request, passando por revisão de código da mesma forma que as funcionalidades.
5.  **Taxonomia:** Organização por domínios (00-geral, 10-produto, 20-arquitetura, etc) para facilitar a descoberta.

## Consequências

### Positivas

- **Proximidade com o Código:** Facilitar a atualização simultânea de código e documentação.
- **Histórico e Versionamento:** Git provê o histórico completo de quem mudou o quê na documentação.
- **Single Source of Truth:** O portal de documentação é a fonte única e confiável de informações técnicas.
- **Segurança:** Acesso controlado via o próprio sistema de autenticação da plataforma (Contextos Admin/User).

### Negativas / Desafios

- **Complexidade Inicial:** Necessidade de construir um renderizador de Markdown no frontend.
- **SEO/Indexação:** Por ser um portal interno, a indexação depende da estrutura da aplicação SPA.
- **Manutenção de Metadados:** Requer rigor dos desenvolvedores para manter o Frontmatter correto.
