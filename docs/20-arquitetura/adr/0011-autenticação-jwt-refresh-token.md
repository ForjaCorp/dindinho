---
id: adr-0011-autenticação-jwt-refresh-token
title: "ADR 0011: Estratégia de Autenticação (JWT + Refresh Token)"
description: "Implementação de autenticação stateless usando JSON Web Tokens (JWT) com rotação de refresh tokens para segurança e persistência de sessão."
audience: ["dev", "segurança"]
visibility: "interno"
status: "estável"
owners: ["engineering"]
tags: ["arquitetura", "segurança", "autenticação", "api"]
mvp: true
createdAt: "2026-02-05"
---

# ADR 0011: Estratégia de Autenticação (JWT + Refresh Token)

## Status

**Aceito** (Estável)

## Contexto

Para uma aplicação PWA moderna e escalável, precisamos de um mecanismo de autenticação que seja stateless (não dependa de sessões no servidor) e que suporte renovação automática de acesso sem exigir que o usuário faça login repetidamente, mantendo um alto nível de segurança.

## Decisão

Adotamos o fluxo de **JWT com Rotação de Refresh Tokens**:

1.  **Access Token:** Um JWT de curta duração (ex: 15-60 min) enviado no cabeçalho `Authorization: Bearer`.
2.  **Refresh Token:** Um token de longa duração (ex: 7-30 dias) persistido no `localStorage` (ou cookies HttpOnly em ambientes web puros) usado para obter novos access tokens.
3.  **Renovação Automática:** O frontend possui um interceptor HTTP que detecta erros `401 Unauthorized`, solicita um novo access token usando o refresh token e repete a requisição original de forma transparente.
4.  **Invalidação:** O logout remove ambos os tokens do cliente e invalida o refresh token no banco de dados do backend.

## Consequências

### Prós

- **Escalabilidade:** O servidor não precisa armazenar sessões ativas na memória, facilitando o escalonamento horizontal.
- **Experiência do Usuário:** Sessões persistentes e renovação silenciosa evitam interrupções no fluxo do usuário.
- **Segurança:** Access tokens de curta duração limitam a janela de exposição em caso de vazamento.

### Contras

- **Complexidade no Frontend:** Exige lógica de interceptação e sincronização de múltiplas requisições falhas durante o refresh (mutex).
- **Gerenciamento de Revogação:** Revogar um access token antes da expiração é complexo; dependemos da invalidação do refresh token para impedir novas sessões.
