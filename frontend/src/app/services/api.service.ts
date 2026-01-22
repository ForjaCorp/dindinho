import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponseDTO,
  LoginDTO,
  LoginResponseDTO,
  CategoryDTO,
  CreateCategoryDTO,
  CreateWalletDTO,
  WalletDTO,
  CreateTransactionDTO,
  TransactionDTO,
} from '@dindinho/shared';

export interface RefreshResponse {
  token: string;
  refreshToken: string;
}

/**
 * Serviço responsável por realizar chamadas à API do backend.
 *
 * @description
 * Este serviço encapsula todas as comunicações HTTP com a API do Dindinho,
 * utilizando configurações de ambiente para determinar URLs adequadas
 * para desenvolvimento e produção.
 *
 * Funcionalidades:
 * - Autenticação de usuários (login)
 * - Gerenciamento de carteiras (criação, listagem)
 * - Comunicação com backend via HttpClient
 * - Configuração automática via environment variables
 *
 * @example
 * // Injeção do serviço:
 * constructor(private api: ApiService) {}
 *
 * // Login de usuário:
 * this.api.login({ email: 'user@dindinho.com', password: 'senha123' })
 *   .subscribe(response => console.log(response.token));
 *
 * // Criação de carteira:
 * this.api.createWallet({ name: 'Minha Carteira', type: 'savings' })
 *   .subscribe(wallet => console.log(wallet.id));
 *
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private handler = inject(HttpBackend);
  private httpNoInterceptor = new HttpClient(this.handler);
  private readonly baseUrl = environment.apiUrl;
  private readonly baseUrlWithoutApi = environment.apiUrl.replace('/api', '');

  getHello(): Observable<ApiResponseDTO> {
    return this.http.get<ApiResponseDTO>(this.baseUrlWithoutApi);
  }

  /**
   * Realiza autenticação de usuário na API.
   *
   * @param {LoginDTO} data - Credenciais do usuário (email e senha)
   * @returns {Observable<LoginResponseDTO>} Observable com token e dados do usuário
   *
   * @description
   * Envia as credenciais do usuário para o endpoint de autenticação.
   * Em caso de sucesso, retorna o token JWT e informações do usuário.
   *
   * @example
   * // Exemplo de uso:
   * this.api.login({ email: 'user@dindinho.com', password: 'senha123' })
   *   .subscribe({
   *     next: (response) => {
   *       console.log('Token:', response.token);
   *       console.log('Usuário:', response.user);
   *     },
   *     error: (error) => console.error('Falha no login', error)
   *   });
   */
  login(data: LoginDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.baseUrl}/login`, data);
  }

  /**
   * Renova o token de acesso usando um refresh token.
   *
   * @param {string} refreshToken - O refresh token atual
   * @returns {Observable<RefreshResponse>} Observable com novos tokens
   */
  refresh(refreshToken: string): Observable<RefreshResponse> {
    return this.httpNoInterceptor.post<RefreshResponse>(`${this.baseUrl}/refresh`, {
      refreshToken,
    });
  }

  /**
   * Cria uma nova carteira para o usuário autenticado.
   *
   * @param {CreateWalletDTO} data - Dados da carteira a ser criada
   * @returns {Observable<WalletDTO>} Observable com a carteira criada
   *
   * @description
   * Envia os dados da nova carteira para o backend. A autenticação é
   * realizada automaticamente pelo interceptor HTTP.
   *
   * @example
   * // Exemplo de uso:
   * this.api.createWallet({ name: 'Carteira Principal', type: 'checking' })
   *   .subscribe({
   *     next: (wallet) => console.log('Carteira criada:', wallet.id),
   *     error: (error) => console.error('Erro ao criar carteira', error)
   *   });
   */
  createWallet(data: CreateWalletDTO): Observable<WalletDTO> {
    return this.http.post<WalletDTO>(`${this.baseUrl}/wallets`, data);
  }

  /**
   * Lista todas as carteiras do usuário autenticado.
   *
   * @returns {Observable<WalletDTO[]>} Observable com array de carteiras
   *
   * @description
   * Recupera todas as carteiras associadas ao usuário atual.
   * A autenticação é realizada automaticamente pelo interceptor HTTP.
   *
   * @example
   * // Exemplo de uso:
   * this.api.getWallets().subscribe({
   *   next: (wallets) => console.log('Carteiras:', wallets),
   *   error: (error) => console.error('Erro ao listar carteiras', error)
   * });
   */
  getWallets(): Observable<WalletDTO[]> {
    return this.http.get<WalletDTO[]>(`${this.baseUrl}/wallets`);
  }

  createTransaction(data: CreateTransactionDTO): Observable<TransactionDTO | TransactionDTO[]> {
    return this.http.post<TransactionDTO | TransactionDTO[]>(`${this.baseUrl}/transactions`, data);
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.baseUrl}/categories`);
  }

  createCategory(data: CreateCategoryDTO): Observable<CategoryDTO> {
    return this.http.post<CategoryDTO>(`${this.baseUrl}/categories`, data);
  }
}
