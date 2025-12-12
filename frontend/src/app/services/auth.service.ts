import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { LoginDTO } from '@dindinho/shared';
import { tap } from 'rxjs/operators';

/**
 * Interface que representa o estado do usuário autenticado
 * @interface UserState
 * @property {string} id - ID único do usuário
 * @property {string} name - Nome do usuário
 * @property {string} email - Email do usuário
 */

/**
 * Interface que representa o estado do usuário autenticado
 */
export interface UserState {
  /** ID único do usuário */
  id: string;
  /** Nome do usuário */
  name: string;
  /** Email do usuário */
  email: string;
}

/**
 * Serviço responsável por gerenciar a autenticação do usuário
 *
 * @description
 * Este serviço lida com:
 * - Autenticação de usuários (login/logout)
 * - Armazenamento seguro do token JWT
 * - Gerenciamento do estado do usuário atual
 * - Redirecionamento de rotas autenticadas
 *
 * @example
 * // Injeção do serviço
 * constructor(private auth: AuthService) {}
 *
 * // Login
 * this.auth.login(credentials).subscribe();
 *
 * // Verificar autenticação
 * const isLoggedIn = this.auth.isAuthenticated();
 *
 * // Logout
 * this.auth.logout();
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  /**
   * Estado reativo do usuário atual
   * @type {Signal<UserState | null>}
   * @readonly
   */
  readonly currentUser = signal<UserState | null>(null);

  /**
   * Realiza o login do usuário
   * @method login
   * @param {LoginDTO} credentials - Credenciais do usuário (email e senha)
   * @returns {Observable<LoginResponse>} Observable com a resposta do servidor
   * @description
   * 1. Envia as credenciais para a API
   * 2. Armazena o token JWT no localStorage
   * 3. Atualiza o estado do usuário atual
   * 4. Redireciona para o dashboard
   */

  login(credentials: LoginDTO) {
    return this.api.login(credentials).pipe(
      tap((response) => {
        // 1. Salvar token
        localStorage.setItem('dindinho_token', response.token);

        // 2. Atualizar estado
        this.currentUser.set(response.user);

        // 3. Redirecionar
        this.router.navigate(['/dashboard']);
      }),
    );
  }

  /**
   * Realiza o logout do usuário
   * @method logout
   * @description
   * 1. Remove o token do localStorage
   * 2. Limpa o estado do usuário
   * 3. Redireciona para a página de login
   */
  logout(): void {
    localStorage.removeItem('dindinho_token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Verifica se o usuário está autenticado
   * @method isAuthenticated
   * @returns {boolean} true se o usuário estiver autenticado, false caso contrário
   * @description
   * Verifica se existe um usuário autenticado no estado atual.
   * Nota: Em produção, deve-se também validar o token JWT armazenado.
   */
  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
