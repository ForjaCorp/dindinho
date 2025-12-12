/**
 * Configuração de ambiente para desenvolvimento.
 *
 * @description
 * Este arquivo contém as variáveis de ambiente utilizadas durante o desenvolvimento
 * da aplicação Angular. Configurações específicas de desenvolvimento como URLs de API
 * locais e flags de depuração são definidas aqui.
 *
 * @property {boolean} production - Indica se está em modo produção (false para desenvolvimento)
 * @property {string} apiUrl - URL base da API para requisições HTTP
 *
 * @example
 * // Uso no ApiService:
 * const baseUrl = environment.apiUrl; // 'http://localhost:3333/api'
 *
 * @since 1.0.0
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3333/api',
};
