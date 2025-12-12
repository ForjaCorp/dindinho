import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor funcional que anexa o token JWT a requisições HTTP internas.
 *
 * @description
 * Este interceptor é responsável por adicionar automaticamente o header Authorization
 * com o token JWT em todas as requisições destinadas à API do Dindinho.
 *
 * Funcionamento:
 * 1. Verifica se existe um token salvo no localStorage com a chave 'dindinho_token'
 * 2. Verifica se a requisição é destinada à nossa API (rotas /api ou localhost:3333)
 * 3. Se existir token e for requisição da API, clona a requisição e adiciona o header
 * 4. Passa a requisição (alterada ou não) para o próximo handler
 *
 * @example
 * // Requisição sem interceptor:
 * // GET /api/wallets
 *
 * // Requisição com interceptor (com token válido):
 * // GET /api/wallets
 * // Headers: { Authorization: 'Bearer eyJhbGciOi...' }
 *
 * @since 1.0.0
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Recupera o token JWT do localStorage usando a chave padronizada
  const token = localStorage.getItem('dindinho_token');

  // Verifica se a requisição é destinada à nossa API
  // - Rotas relativas: /api/* (ambiente de produção com proxy)
  // - URLs de desenvolvimento: localhost:3333 (ambiente local)
  const isApiRequest = req.url.startsWith('/api') || req.url.includes('localhost:3333');

  // Adiciona o header Authorization apenas para requisições da API com token válido
  if (token && isApiRequest) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedRequest);
  }

  // Para requisições externas ou sem token, mantém a requisição original
  return next(req);
};
