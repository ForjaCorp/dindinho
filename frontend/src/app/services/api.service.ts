import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponseDTO,
  LoginDTO,
  LoginResponseDTO,
  CreateWalletDTO,
  WalletDTO,
} from '@dindinho/shared';

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
  private baseUrl = 'http://localhost:3333';

  /**
   * Obtém uma saudação da API
   * @method getHello
   * @returns {Observable<ApiResponseDTO>} Observable contendo a resposta da API
   * @example
   * // Exemplo de uso:
   * apiService.getHello().subscribe({
   *   next: (response) => console.log(response.message),
   *   error: (error) => console.error('Erro ao conectar à API', error)
   * });
   */
  getHello(): Observable<ApiResponseDTO> {
    return this.http.get<ApiResponseDTO>(this.baseUrl);
  }

  login(data: LoginDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.baseUrl}/api/login`, data);
  }

  createWallet(data: CreateWalletDTO): Observable<WalletDTO> {
    return this.http.post<WalletDTO>(`${this.baseUrl}/api/wallets`, data);
  }

  getWallets(): Observable<WalletDTO[]> {
    return this.http.get<WalletDTO[]>(`${this.baseUrl}/api/wallets`);
  }
}
