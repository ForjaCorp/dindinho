---
id: doc-authentication
title: "Autenticação (Frontend + API)"
description: "Fluxo de autenticação com JWT, access token e refresh token."
audience: ["dev"]
visibility: "internal"
status: "stable"
owners: ["engineering"]
tags: ["auth", "api", "frontend"]
mvp: true
createdAt: "2026-02-03"
updatedAt: "2026-02-03"
---

# Autenticação (Frontend + API)

Este documento descreve o fluxo de autenticação do Dindinho, com JWT (access token) e rotação de refresh token.

## Componentes

- `AuthService` (frontend): orquestra login/logout, guarda tokens e mantém o estado do usuário.
- `authInterceptor` (frontend): anexa o access token e gerencia refresh automático em 401 (com mutex).
- `ApiService` (frontend): encapsula chamadas HTTP e expõe `login()` e `refresh()`.

## Contratos e armazenamento

- Access token: `localStorage["dindinho_token"]`
- Refresh token: `localStorage["dindinho_refresh_token"]`

O interceptor só injeta `Authorization: Bearer ...` quando a request é interna (ex.: `/api/*` ou `localhost:3333`).

## Contrato de erro (ApiErrorResponseDTO)

O backend padroniza respostas de erro em um envelope único (contrato compartilhado) definido em `@dindinho/shared`.

- Fonte do contrato: [error.schema.ts](../../packages/shared/src/schemas/error.schema.ts)
- Tipo: `ApiErrorResponseDTO`
- Schema: `apiErrorResponseSchema`

Campos principais:

- `statusCode`: status HTTP
- `error`: label HTTP (ex.: `Bad Request`, `Unauthorized`)
- `message`: mensagem humana (para UI/logs)
- `requestId` (opcional): id da request (correlaciona logs)
- `code` (opcional): código estável para tratamento por clientes (`^[A-Z0-9_]+$`)
- `issues` (opcional): erros de validação (ex.: Zod)
- `details` (opcional): detalhes adicionais (não deve vazar em produção)

Exemplo (401):

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Token inválido ou expirado",
  "code": "INVALID_TOKEN",
  "requestId": "req-abc123"
}
```

## Convenções de validação (Zod)

O backend usa Zod como fonte de verdade para validação e para contratos em runtime.

- `body`, `querystring`, `params` e `response` sempre definidos em Zod nas rotas
- `z.coerce` só quando o valor vem como string (principalmente querystring) e a coerção é óbvia e estável
- `.transform` deve ser puro e previsível (sem IO, sem dependência de tempo/ambiente); preferir normalizações simples (trim/lowercase)
- Preferir schemas compartilhados em `@dindinho/shared` quando o contrato também é consumido pelo frontend

## Versionamento do @dindinho/shared

`@dindinho/shared` é contrato compartilhado (frontend/backend). Mudanças em schemas/DTOs devem seguir SemVer.

- Patch: correções internas que não alteram o contrato público
- Minor: adições compatíveis (campos opcionais novos, endpoints/DTOs novos)
- Major: qualquer quebra de compatibilidade (campo removido, tipo estreitado, mudança de formato)

Enquanto o pacote estiver em `0.x`, trate mudanças incompatíveis como incremento de `minor` (prática comum em pré-1.0).

Registro de alterações do pacote: [CHANGELOG.md](../../packages/shared/CHANGELOG.md)

## Fluxos

### Login

1. UI chama `AuthService.login(credentials)`
2. `ApiService.login()` chama a API
3. `AuthService` persiste `token` e `refreshToken`, atualiza usuário atual e navega para o app

### Requests autenticadas + rotação

1. Interceptor adiciona `Authorization` em requests da API
2. Se a API retornar 401:
   - inicia `AuthService.refreshToken()` (ou aguarda se já houver refresh em andamento)
   - atualiza os tokens no storage
   - reexecuta a request original com o novo token
3. Se o refresh falhar: faz logout e propaga erro

### Logout

- Remove `dindinho_token` e `dindinho_refresh_token`
- Limpa estado do usuário e redireciona para `/login`

## Produção

- Recomendado servir o frontend e fazer proxy da API no mesmo host, expondo a API em `/api`.
- Variáveis de ambiente e detalhes operacionais: `../../backend/README.md`.

## Referências no código

- `AuthService`: [auth.service.ts](../../frontend/src/app/services/auth.service.ts)
- Interceptor: [auth.interceptor.ts](../../frontend/src/app/interceptors/auth.interceptor.ts)
- API client: [api.service.ts](../../frontend/src/app/services/api.service.ts)
