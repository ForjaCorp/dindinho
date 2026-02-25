import { CanActivateFn } from '@angular/router';

/**
 * Guarda de rota para isolar o subdomínio de documentação.
 * Se o usuário estiver no subdomínio 'docs', ele só pode acessar rotas de documentação ou login/signup.
 * Tentativas de acessar outras rotas (como dashboard) serão redirecionadas para o domínio principal
 * ou para a raiz da documentação se estivermos em desenvolvimento.
 */
export const subdomainGuard: CanActivateFn = (_route, state) => {
  const hostname = window.location.hostname;
  const url = state.url;
  const origin = window.location.origin;

  // 1. Detectar se estamos no subdomínio de documentação ou em um PR Preview de docs
  // Suporta: docs.dindinho.com, docs.localhost, 16.docs.rckww...sslip.io
  const isDocsSubdomain = hostname.includes('docs.') || hostname.includes('.docs.');

  if (isDocsSubdomain) {
    // No subdomínio 'docs.', só permitimos rotas de documentação ou auth básica
    const isAllowedInDocs =
      url.startsWith('/docs') ||
      url.startsWith('/login') ||
      url.startsWith('/signup') ||
      url === '/';

    if (isAllowedInDocs) {
      return true;
    }

    // Se tentar acessar o app principal pelo subdomínio docs, redireciona para o domínio principal
    // Para PR Previews (sslip.io), o domínio costuma ser fixo por container, então deixamos passar
    if (!hostname.endsWith('sslip.io')) {
      const mainOrigin = origin.replace('://docs.', '://');
      window.location.href = `${mainOrigin}${url}`;
      return false;
    }

    return true;
  } else {
    // No domínio principal, NÃO permitimos rotas de documentação
    const isTryingDocs = url.startsWith('/docs');

    if (isTryingDocs) {
      // Redireciona para o subdomínio docs
      // Mantemos o comportamento original que os testes esperam (mesmo em localhost)
      const docsOrigin = origin.replace('://', '://docs.');

      window.location.href = `${docsOrigin}${url}`;
      return false;
    }

    return true;
  }
};
