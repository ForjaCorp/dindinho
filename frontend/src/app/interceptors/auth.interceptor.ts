import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor funcional que anexa o token JWT a requisições HTTP internas.
 *
 * @description
 * 1. Verifica se existe um token salvo no localStorage.
 * 2. Verifica se a requisição é interna (não começa com http/https).
 * 3. Se existir token e for requisição interna, clona a requisição e adiciona o header Authorization.
 * 4. Passa a requisição (alterada ou não) para o próximo handler.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // A chave deve ser a mesma usada no AuthService
  const token = localStorage.getItem('dindinho_token');

  // Não adicionar token para requisições externas (URLs absolutas)
  if (token && !req.url.startsWith('http')) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedRequest);
  }

  return next(req);
};
