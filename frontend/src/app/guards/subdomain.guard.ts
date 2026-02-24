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
  // Suporta: docs.dindinho.com, docs.localhost, 16.docs.dindinho.com, etc.
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

    // Se tentar acessar o app principal pelo subdomínio docs, e NÃO for um PR Preview (que tem domínios fixos por serviço)
    // Redireciona para o domínio principal apenas se for o padrão prod/dev simples
    if (hostname.startsWith('docs.')) {
      const mainOrigin = origin.replace('://docs.', '://');
      window.location.href = `${mainOrigin}${url}`;
      return false;
    }

    return true;
  } else {
    // No domínio principal, NÃO permitimos rotas de documentação (exceto se for localhost sem configuração de hosts)
    const isTryingDocs = url.startsWith('/docs');

    if (isTryingDocs) {
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return true; // Permite docs em localhost sem subdomínio para facilitar dev
      }

      // Redireciona para o subdomínio docs
      const docsOrigin = origin.replace('://', '://docs.');

      window.location.href = `${docsOrigin}${url}`;
      return false;
    }

    return true;
  }
};
