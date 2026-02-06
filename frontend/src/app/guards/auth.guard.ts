import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guarda de rota para proteger páginas que exigem autenticação.
 * Verifica se o usuário está logado através do AuthService.
 * Se não estiver, redireciona para a página de login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const user = authService.currentUser();
  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const requiredRole = route.data?.['requiredRole'] as typeof user.role | undefined;
  const allowedRoles = route.data?.['roles'] as (typeof user.role)[] | undefined;

  if (requiredRole && user.role !== requiredRole) {
    return router.createUrlTree(['/dashboard']);
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
