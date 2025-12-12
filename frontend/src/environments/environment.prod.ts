/**
 * Configuração de ambiente para produção.
 *
 * @description
 * Este arquivo contém as variáveis de ambiente utilizadas em produção da aplicação Angular.
 * URLs relativas são utilizadas para permitir configuração via proxy no servidor web.
 *
 * @property {boolean} production - Indica se está em modo produção (true para produção)
 * @property {string} apiUrl - URL base da API para requisições HTTP (relativa para proxy)
 *
 * @example
 * // Uso no ApiService:
 * const baseUrl = environment.apiUrl; // '/api'
 *
 * // Configuração de proxy recomendada (nginx):
 * // location /api {
 * //   proxy_pass http://backend:3333;
 * // }
 *
 * @since 1.0.0
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
