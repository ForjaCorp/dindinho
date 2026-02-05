---
id: adr-0006-sincronização-estado-url
title: "ADR 0006: Sincronização Unidirecional de Estado via URL"
description: "Uso da URL (Query Params) como fonte de verdade para filtros e estados de visualização compartilháveis."
audience: ["dev", "arquitetura"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "frontend", "ux", "routing"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0006: Sincronização Unidirecional de Estado via URL

## Status

Aceito (Implementado)

## Contexto

Em aplicações financeiras, os usuários frequentemente aplicam filtros complexos (intervalos de datas, contas específicas, categorias). Se esse estado for mantido apenas na memória do componente, ele é perdido ao atualizar a página e não pode ser compartilhado via link.

## Decisão

Adotamos a **Sincronização Unidirecional via URL** para estados de filtro.

1.  **Fonte de Verdade:** A URL (Query Params) é a fonte primária do estado dos filtros.
2.  **Fluxo:** O componente observa as mudanças na rota (`ActivatedRoute.queryParams`) e atualiza seus Signals internos.
3.  **Atualização:** Ações do usuário (ex: mudar data) disparam uma navegação para a mesma rota com novos parâmetros, em vez de alterar o estado local diretamente.
4.  **Serviço Central:** Utilizamos o `UrlSyncService` para encapsular a lógica de serialização e desserialização de objetos complexos para strings de URL.

## Consequências

### Positivas

- **Links Compartilháveis:** Usuários podem enviar um link de um relatório específico com todos os filtros aplicados.
- **Persistência de Refresh:** O estado sobrevive à atualização da página (`F5`).
- **Histórico do Navegador:** O botão "Voltar" funciona intuitivamente para desfazer filtros aplicados.
- **Desacoplamento:** Componentes de filtro não precisam se comunicar diretamente com componentes de lista; ambos apenas reagem à URL.

### Negativas / Desafios

- **URLs Extensas:** Filtros muito complexos podem gerar URLs visualmente poluídas.
- **Complexidade de Serialização:** Requer cuidado para converter tipos não-string (datas, arrays) de forma consistente.
