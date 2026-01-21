import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, throwError, filter, take, switchMap, catchError } from 'rxjs';

// Mutex para controlar a rotação de token
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Reseta o estado do interceptor (apenas para testes)
 */
export function resetInterceptorState() {
  isRefreshing = false;
  refreshTokenSubject.next(null);
}

/**
 * Interceptor funcional que anexa o token JWT a requisições HTTP internas.
 * Também gerencia a renovação automática do token (Refresh Token Rotation).
 *
 * @description
 * 1. Anexa o token JWT se disponível.
 * 2. Se a requisição falhar com 401:
 *    - Inicia o fluxo de refresh token se não estiver em andamento.
 *    - Se já estiver em andamento, aguarda o novo token.
 *    - Se o refresh falhar, realiza logout.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('dindinho_token');

  // Verifica se a requisição é destinada à nossa API
  const isApiRequest = req.url.startsWith('/api') || req.url.includes('localhost:3333');

  let authReq = req;

  // Adiciona o header Authorization se houver token e for request da API
  if (token && isApiRequest) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest) {
        // Se já estiver atualizando, aguarda o novo token
        if (isRefreshing) {
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((newToken) => {
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                }),
              );
            }),
          );
        } else {
          // Inicia o processo de refresh
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((newToken) => {
              isRefreshing = false;
              refreshTokenSubject.next(newToken);
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                }),
              );
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              authService.logout();
              return throwError(() => refreshError);
            }),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};
