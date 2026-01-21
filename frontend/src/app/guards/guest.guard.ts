import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guarda de rota para impedir que usuários autenticados acessem páginas públicas (como login).
 * Verifica se o usuário está logado através do AuthService.
 * Se estiver, redireciona para o dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Se o usuário estiver autenticado, redireciona para o dashboard
  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  // Caso contrário, permite o acesso à página pública
  return true;
};
