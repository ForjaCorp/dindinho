import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interface que define a estrutura da resposta da API
 * @interface ApiResponse
 * @property {string} message - Mensagem de retorno da API
 * @property {string} aviso - Mensagem de aviso, se houver
 * @property {Object} endpoints - Objeto contendo os endpoints disponíveis
 * @property {string} endpoints.health - Endpoint para verificação de saúde da API
 * @property {string} endpoints.test_db - Endpoint para teste de conexão com o banco de dados
 */
export interface ApiResponse {
  message: string;
  aviso: string;
  endpoints: {
    health: string;
    test_db: string;
  };
}

/**
 * Serviço responsável por realizar chamadas à API do backend
 * @class ApiService
 * @description Serviço que encapsula as chamadas HTTP para a API do backend
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3333';

  /**
   * Obtém uma saudação da API
   * @method getHello
   * @returns {Observable<ApiResponse>} Observable contendo a resposta da API
   * @example
   * // Exemplo de uso:
   * apiService.getHello().subscribe({
   *   next: (response) => console.log(response.message),
   *   error: (error) => console.error('Erro ao conectar à API', error)
   * });
   */
  getHello(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(this.apiUrl);
  }
}
