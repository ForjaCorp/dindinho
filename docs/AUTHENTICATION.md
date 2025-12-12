# Arquitetura de Autenticação - Dindinho

## Visão Geral

Este documento descreve a arquitetura de autenticação implementada na aplicação Dindinho, cobrindo o fluxo completo desde o login até as requisições autenticadas à API.

## Componentes da Arquitetura

### 1. AuthService (`frontend/src/app/services/auth.service.ts`)

**Responsabilidade**: Gerenciar o estado de autenticação do usuário.

**Funcionalidades**:

- Login e logout de usuários
- Armazenamento seguro do token JWT no localStorage
- Decodificação e validação de tokens
- Gerenciamento do estado reativo do usuário usando Signals
- Restauração automática de sessão

**Fluxo de Login**:

1. Recebe credenciais do usuário
2. Envia para API via ApiService
3. Armazena token JWT no localStorage
4. Decodifica token para extrair dados do usuário
5. Atualiza estado reativo
6. Redireciona para dashboard

### 2. AuthInterceptor (`frontend/src/app/interceptors/auth.interceptor.ts`)

**Responsabilidade**: Incluir automaticamente o token JWT em requisições à API.

**Funcionalidades**:

- Intercepta todas as requisições HTTP
- Adiciona header `Authorization: Bearer <token>` para requisições da API
- Verifica se a requisição é destinada à nossa API
- Não interfere em requisições externas

**Detecção de Requisições da API**:

```typescript
const isApiRequest =
  req.url.startsWith("/api") || req.url.includes("localhost:3333");
```

### 3. ApiService (`frontend/src/app/services/api.service.ts`)

**Responsabilidade**: Comunicação com a API do backend.

**Funcionalidades**:

- Encapsula todas as chamadas HTTP
- Utiliza configurações de ambiente para URLs
- Integração automática com AuthInterceptor
- Métodos específicos para cada endpoint

**Configuração de Ambiente**:

- **Desenvolvimento**: `http://localhost:3333/api`
- **Produção**: `/api` (requer proxy)

### 4. Environment Configuration

**Desenvolvimento** (`environment.ts`):

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:3333/api",
};
```

**Produção** (`environment.prod.ts`):

```typescript
export const environment = {
  production: true,
  apiUrl: "/api",
};
```

## Fluxo Completo de Autenticação

### 1. Login do Usuário

```
Usuário → Login Form → AuthService.login() → ApiService.login() → Backend API
                                                              ↓
Token JWT ← AuthService ← AuthInterceptor ← ← ← ← ← ← ← ← ← ← ←
```

### 2. Requisições Autenticadas

```
Componente → ApiService → AuthInterceptor → Backend API
                                    ↓
                           Adiciona Authorization Header
```

### 3. Logout do Usuário

```
Usuário → Logout → AuthService.logout() → Remove Token → Limpa Estado
```

## Configuração de Produção

### Proxy Nginx (Recomendado)

```nginx
server {
    listen 80;
    server_name dindinho.com;

    # Frontend (Angular)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://backend:3333;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Build de Produção

```bash
# Build com configuração de produção
ng build --configuration production

# O Angular automaticamente usa environment.prod.ts
```

## Segurança

### Armazenamento de Token

- **Local Storage**: Utilizado para persistência entre sessões
- **Chave Padronizada**: `dindinho_token`
- **Validação**: Token é validado a cada restauração de sessão

### Expiração de Token

- **Verificação Automática**: AuthService verifica expiração ao restaurar sessão
- **Limpeza**: Tokens expirados são removidos automaticamente
- **Redirecionamento**: Usuário é redirecionado para login quando token expira

### Interceptor Security

- **Scope Limitado**: Apenas requisições da API recebem o token
- **External Requests**: Requisições para domínios externas não são modificadas
- **Token Validation**: Interceptor não valida token, apenas adiciona header

## Boas Práticas Implementadas

### 1. Separation of Concerns

- **AuthService**: Lógica de autenticação
- **ApiService**: Comunicação HTTP
- **AuthInterceptor**: Injeção de headers
- **Environment**: Configuração de URLs

### 2. Reactive State Management

- **Signals**: Estado reativo do usuário
- **Automatic Updates**: Componentes reagem a mudanças de autenticação

### 3. Environment-Based Configuration

- **Development**: URLs absolutas para localhost
- **Production**: URLs relativas para proxy
- **No Code Changes**: Mesmo código funciona em ambos ambientes

### 4. Error Handling

- **Token Expiration**: Tratamento automático de tokens expirados
- **Network Errors**: Tratamento de erros de conexão
- **Invalid Credentials**: Feedback claro para usuário

## Testes

### Unit Tests

- **AuthService**: Testes de login, logout, validação de token
- **ApiService**: Testes de chamadas HTTP com mocks
- **AuthInterceptor**: Testes de interceptação de requisições

### Integration Tests

- **Login Flow**: Teste completo do fluxo de autenticação
- **API Requests**: Teste de requisições autenticadas
- **Token Expiration**: Teste de comportamento com token expirado

## Troubleshooting

### Problemas Comuns

1. **401 Unauthorized**
   - **Causa**: Token não encontrado ou inválido
   - **Solução**: Verificar localStorage e fazer login novamente

2. **Token não enviado**
   - **Causa**: Interceptor não registrado
   - **Solução**: Verificar configuração em `app.config.ts`

3. **URL incorreta em produção**
   - **Causa**: Proxy não configurado
   - **Solução**: Configurar proxy no servidor web

### Debug Commands

```javascript
// Verificar token no console
localStorage.getItem("dindinho_token");

// Verificar estado do usuário (via Angular DevTools)
// Inspecionar AuthService.currentUser()

// Verificar headers da requisição (via DevTools Network)
// Analisar header Authorization nas requisições /api/*
```

## Futuras Melhorias

1. **Token Refresh**: Implementar refresh tokens automático
2. **Multi-Factor Auth**: Adicionar camada extra de segurança
3. **Session Management**: Controle de sessões ativas
4. **Rate Limiting**: Limitar tentativas de login
5. **Audit Logs**: Registrar atividades de autenticação
