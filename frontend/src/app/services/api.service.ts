import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  HealthCheckDTO,
  LoginDTO,
  LoginResponseDTO,
  CategoryDTO,
  CreateCategoryDTO,
  CreateAccountDTO,
  AccountDTO,
  UpdateAccountDTO,
  CreateTransactionDTO,
  TransactionDTO,
  UpdateTransactionDTO,
  UpdateTransactionScopeDTO,
  DeleteTransactionScopeDTO,
  DeleteTransactionResponseDTO,
  CreateUserDTO,
  CreateWaitlistDTO,
} from '@dindinho/shared';

export interface RefreshResponse {
  token: string;
  refreshToken: string;
}

export interface AllowlistItem {
  id: string;
  email: string;
  createdAt: string;
}

export interface AllowlistDeleteResponse {
  deleted: boolean;
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
 * - Gerenciamento de contas (criação, listagem)
 * - Comunicação com backend via HttpClient
 * - Configuração automática via environment variables
 *
 * @example
 * // Injeção do serviço:
 * constructor(private api: ApiService) {}
 * @example
 * // Exemplo de uso:
 * this.api.login({ email: 'user@dindinho.com', password: 'senha123' })
 *   .subscribe(response => response.token);
 *
 * // Criação de conta:
 * this.api.createAccount({ name: 'Minha Conta', type: 'STANDARD' })
 *   .subscribe((account) => account.id);
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
  getHello(): Observable<HealthCheckDTO> {
    return this.http.get<HealthCheckDTO>(`${this.baseUrl}/health`);
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
   *       // Sucesso
   *     },
   *     error: (error) => {
   *       // Erro
   *     }
   *   });
   */
  login(data: LoginDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${this.baseUrl}/auth/login`, data);
  }

  /**
   * Registra um novo usuário na API.
   * @param data Dados do novo usuário
   * @returns Observable com dados do usuário criado
   */
  createUser(data: CreateUserDTO): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/users`, data);
  }

  signup(data: CreateUserDTO): Observable<unknown> {
    return this.createUser(data);
  }

  joinWaitlist(data: CreateWaitlistDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/waitlist`, data);
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
   * Cria uma nova conta para o usuário autenticado.
   *
   * @param {CreateAccountDTO} data - Dados da conta a ser criada
   * @returns {Observable<AccountDTO>} Observable com a conta criada
   *
   * @description
   * Envia os dados da nova conta para o backend. A autenticação é
   * realizada automaticamente pelo interceptor HTTP.
   *
   * @example
   * // Exemplo de uso:
   * this.api.createAccount({ name: 'Conta Principal', type: 'STANDARD' })
   *   .subscribe({
   *     next: (account) => {},
   *     error: (error) => {}
   *   });
   */
  createAccount(data: CreateAccountDTO): Observable<AccountDTO> {
    return this.http.post<AccountDTO>(`${this.baseUrl}/accounts`, data);
  }

  /**
   * Lista todas as contas do usuário autenticado.
   *
   * @returns {Observable<AccountDTO[]>} Observable com array de contas
   *
   * @description
   * Recupera todas as contas associadas ao usuário atual.
   * A autenticação é realizada automaticamente pelo interceptor HTTP.
   *
   * @example
   * // Exemplo de uso:
   * this.api.getAccounts().subscribe({
   *   next: (accounts) => {},
   *   error: (error) => {}
   * });
   */
  getAccounts(): Observable<AccountDTO[]> {
    return this.http.get<AccountDTO[]>(`${this.baseUrl}/accounts`);
  }

  getAccount(id: string): Observable<AccountDTO> {
    return this.http.get<AccountDTO>(`${this.baseUrl}/accounts/${id}`);
  }

  updateAccount(id: string, data: UpdateAccountDTO): Observable<AccountDTO> {
    return this.http.patch<AccountDTO>(`${this.baseUrl}/accounts/${id}`, data);
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/accounts/${id}`);
  }

  createTransaction(data: CreateTransactionDTO): Observable<TransactionDTO | TransactionDTO[]> {
    return this.http.post<TransactionDTO | TransactionDTO[]>(`${this.baseUrl}/transactions`, data);
  }

  /**
   * Lista transações com filtros opcionais.
   *
   * @description
   * Suporta paginação via `cursorId` e `limit`.
   * Para filtro temporal, use `invoiceMonth` (YYYY-MM) ou `startDay/endDay` (YYYY-MM-DD)
   * com `tzOffsetMinutes` para interpretar o “dia local”.
   */
  getTransactions(params: {
    accountId?: string;
    accountIds?: string[];
    categoryId?: string;
    from?: string;
    to?: string;
    startDay?: string;
    endDay?: string;
    tzOffsetMinutes?: number;
    invoiceMonth?: string;
    q?: string;
    type?: TransactionDTO['type'];
    limit?: number;
    cursorId?: string;
  }): Observable<{ items: TransactionDTO[]; nextCursorId: string | null }> {
    const queryParams: Record<string, string | string[]> = {
      ...(params.accountId ? { accountId: params.accountId } : {}),
      ...(params.accountIds && params.accountIds.length ? { accountIds: params.accountIds } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      ...(params.startDay ? { startDay: params.startDay } : {}),
      ...(params.endDay ? { endDay: params.endDay } : {}),
      ...(typeof params.tzOffsetMinutes === 'number'
        ? { tzOffsetMinutes: String(params.tzOffsetMinutes) }
        : {}),
      ...(params.invoiceMonth ? { invoiceMonth: params.invoiceMonth } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(typeof params.limit === 'number' ? { limit: String(params.limit) } : {}),
      ...(params.cursorId ? { cursorId: params.cursorId } : {}),
    };

    return this.http.get<{ items: TransactionDTO[]; nextCursorId: string | null }>(
      `${this.baseUrl}/transactions`,
      {
        params: queryParams,
      },
    );
  }

  getTransactionById(id: string): Observable<TransactionDTO> {
    return this.http.get<TransactionDTO>(`${this.baseUrl}/transactions/${id}`);
  }

  updateTransaction(
    id: string,
    data: UpdateTransactionDTO,
    scope: UpdateTransactionScopeDTO = 'ONE',
  ): Observable<TransactionDTO> {
    return this.http.patch<TransactionDTO>(`${this.baseUrl}/transactions/${id}`, data, {
      params: { scope },
    });
  }

  deleteTransaction(
    id: string,
    scope: DeleteTransactionScopeDTO = 'ONE',
  ): Observable<DeleteTransactionResponseDTO> {
    return this.http.delete<DeleteTransactionResponseDTO>(`${this.baseUrl}/transactions/${id}`, {
      params: { scope },
    });
  }

  getCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.baseUrl}/categories`);
  }

  createCategory(data: CreateCategoryDTO): Observable<CategoryDTO> {
    return this.http.post<CategoryDTO>(`${this.baseUrl}/categories`, data);
  }

  updateCategory(id: string, data: CreateCategoryDTO): Observable<CategoryDTO> {
    return this.http.patch<CategoryDTO>(`${this.baseUrl}/categories/${id}`, data);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${id}`);
  }

  getAllowlist(adminKey: string): Observable<AllowlistItem[]> {
    return this.http.get<AllowlistItem[]>(`${this.baseUrl}/allowlist`, {
      headers: {
        'x-admin-key': adminKey,
      },
    });
  }

  /**
   * Métodos genéricos para chamadas à API
   * @description Facilita chamadas para novos endpoints sem precisar criar métodos específicos
   */
  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`);
  }

  post<T>(path: string, data: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, data);
  }

  patch<T>(path: string, data: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${path}`, data);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${path}`);
  }

  addAllowlistEmail(adminKey: string, email: string): Observable<AllowlistItem> {
    return this.http.post<AllowlistItem>(
      `${this.baseUrl}/allowlist`,
      { email },
      {
        headers: {
          'x-admin-key': adminKey,
        },
      },
    );
  }

  deleteAllowlistEmail(adminKey: string, email: string): Observable<AllowlistDeleteResponse> {
    return this.http.delete<AllowlistDeleteResponse>(
      `${this.baseUrl}/allowlist/${encodeURIComponent(email)}`,
      {
        headers: {
          'x-admin-key': adminKey,
        },
      },
    );
  }
}
