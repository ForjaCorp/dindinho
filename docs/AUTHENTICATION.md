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
- Variáveis de ambiente e detalhes operacionais: `backend/README.md`.

## Referências no código

- `AuthService`: [auth.service.ts](../frontend/src/app/services/auth.service.ts)
- Interceptor: [auth.interceptor.ts](../frontend/src/app/interceptors/auth.interceptor.ts)
- API client: [api.service.ts](../frontend/src/app/services/api.service.ts)
