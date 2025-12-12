import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guarda de rota para proteger páginas que exigem autenticação.
 * Verifica se o usuário está logado através do AuthService.
 * Se não estiver, redireciona para a página de login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Se o usuário estiver autenticado, permite o acesso
  if (authService.isAuthenticated()) {
    return true;
  }

  // Caso contrário, redireciona para o login
  return router.createUrlTree(['/login']);
};
