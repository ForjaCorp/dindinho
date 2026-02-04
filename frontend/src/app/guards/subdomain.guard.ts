import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * Guarda de rota para isolar o subdomínio de documentação.
 * Se o usuário estiver no subdomínio 'docs', ele só pode acessar rotas de documentação ou login/signup.
 * Tentativas de acessar outras rotas (como dashboard) serão redirecionadas para o domínio principal
 * ou para a raiz da documentação se estivermos em desenvolvimento.
 */
export const subdomainGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const hostname = window.location.hostname;
  const isDocsSubdomain = hostname.startsWith('docs.');

  if (!isDocsSubdomain) {
    return true;
  }

  const url = state.url;
  const isAllowedPath =
    url.startsWith('/docs') || url.startsWith('/login') || url.startsWith('/signup') || url === '/';

  if (isAllowedPath) {
    return true;
  }

  // Se não for um caminho permitido no subdomínio docs, redirecionamos.
  // Em produção, iríamos para o domínio principal.
  if (hostname.includes('forjacorp.com')) {
    const mainDomain = hostname.replace('docs.', '');
    window.location.href = `https://${mainDomain}${url}`;
    return false;
  }

  // Fallback para desenvolvimento ou outros casos
  return router.createUrlTree(['/docs']);
};
