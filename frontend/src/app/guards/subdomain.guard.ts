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

  // 1. Detectar se estamos no subdomínio de documentação
  const isDocsSubdomain = hostname.startsWith('docs.');

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
    const mainOrigin = origin.replace('docs.', '');
    window.location.href = `${mainOrigin}${url}`;
    return false;
  } else {
    // No domínio principal, NÃO permitimos rotas de documentação
    const isTryingDocs = url.startsWith('/docs');

    if (isTryingDocs) {
      // Redireciona para o subdomínio docs
      // Em produção: dindinho.com -> docs.dindinho.com
      // Em desenvolvimento: localhost:4200 -> docs.localhost:4200 (se suportado) ou apenas informa
      let docsOrigin: string;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Para desenvolvimento, tentamos adicionar o prefixo docs. ao localhost
        // Se o navegador não resolver, o dev precisará configurar o /etc/hosts
        docsOrigin = origin.replace('://', '://docs.');
      } else {
        docsOrigin = origin.replace('://', '://docs.');
      }

      window.location.href = `${docsOrigin}${url}`;
      return false;
    }

    return true;
  }
};
