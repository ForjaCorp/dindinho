/**
 * Utilitário para manipulação de cookies com suporte a subdomínios.
 */
export class CookieUtil {
  /**
   * Define um cookie.
   *
   * @param name Nome do cookie
   * @param value Valor do cookie
   * @param days Dias para expirar (opcional)
   * @param shareAcrossSubdomains Se deve compartilhar entre subdomínios (ex: .localhost ou .dindinho.com)
   */
  static set(name: string, value: string, days?: number, shareAcrossSubdomains = true): void {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }

    let domain = '';
    if (shareAcrossSubdomains && typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // Se for localhost, usamos 'localhost' ou omitimos para o domínio atual
      // Se for um domínio real (ex: app.dindinho.com), usamos '.dindinho.com'
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Localhost é um caso especial. A maioria dos browsers modernos não permite
        // compartilhar cookies entre subdomínios de localhost (ex: localhost -> docs.localhost)
        // usando o atributo 'domain'.
        // Em produção isso funcionará perfeitamente com domínios reais.
        domain = '';
      } else if (hostname.includes('localhost')) {
        // Suporte para subdomínios de localhost (ex: docs.localhost)
        // Alguns navegadores permitem .localhost como domínio base
        domain = '; domain=.localhost';
      } else {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          // Se for algo como staging.dindinho.com ou app.dindinho.com
          // Queremos .dindinho.com
          // Mas se for staging.dindinho (sem .com, comum em ambientes de dev/staging internos)
          // Queremos .dindinho

          // Lógica para detectar se é um domínio composto (ex: .com.br)
          const isTldComposite =
            parts.length >= 3 &&
            ['com', 'net', 'org', 'edu', 'gov'].includes(parts[parts.length - 2]);

          const sliceCount = isTldComposite ? -3 : -2;
          const baseDomain = parts.slice(sliceCount).join('.');
          domain = `; domain=.${baseDomain}`;
        }
      }
    }

    document.cookie = `${name}=${value || ''}${expires}; path=/${domain}; SameSite=Lax`;
  }

  /**
   * Obtém o valor de um cookie.
   *
   * @param name Nome do cookie
   * @returns Valor do cookie ou null
   */
  static get(name: string): string | null {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let c of ca) {
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  /**
   * Remove um cookie.
   *
   * @param name Nome do cookie
   */
  static delete(name: string): void {
    this.set(name, '', -1);
  }
}
