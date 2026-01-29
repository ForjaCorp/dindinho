import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, RefreshResponse } from './api.service';
import { LoginDTO, LoginResponseDTO, CreateUserDTO, CreateWaitlistDTO } from '@dindinho/shared';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { LoggerService } from './logger.service';
import { ErrorMapper } from '../utils/error-mapper';

/**
 * Interface que representa o estado do usuário autenticado
 */
export type UserState = LoginResponseDTO['user'];

/**
 * Interface que representa o payload do token JWT
 * @interface JwtPayload
 * @property {string} sub - ID único do usuário
 * @property {string} name - Nome completo do usuário
 * @property {string} email - Endereço de e-mail do usuário
 * @property {number} exp - Timestamp (em segundos) de quando o token expira
 */
interface JwtPayload {
  /** ID único do usuário */
  sub: string;
  /** Nome completo do usuário */
  name: string;
  /** Endereço de e-mail do usuário */
  email: string;
  role: UserState['role'];
  /** Timestamp (em segundos) de quando o token expira */
  exp: number;
}

/**
 * Serviço responsável por gerenciar a autenticação do usuário
 *
 * @description
 * Este serviço fornece funcionalidades completas de autenticação, incluindo:
 * - Autenticação de usuários (login/logout)
 * - Armazenamento seguro do token JWT no localStorage
 * - Gerenciamento do estado do usuário atual usando Signals
 * - Redirecionamento de rotas autenticadas
 * - Restauração automática de sessão ao recarregar a página
 * - Validação de token JWT e tratamento de expiração
 *
 * @example
 * // Injeção do serviço
 * constructor(private auth: AuthService) {}
 *
 * // Login
 * this.auth.login(credentials).subscribe({
 *   next: () => {
 *     // Redirecionamento é feito automaticamente
 *   },
 *   error: (err) => {
 *     // Tratar erro
 *   }
 * });
 *
 * // Verificar autenticação
 * if (this.auth.isAuthenticated()) {
 *   // Usuário autenticado
 * }
 *
 * // Logout
 * this.auth.logout();
 *
 * // Acesso ao usuário atual (reativo)
 * effect(() => {
 *   const user = this.auth.currentUser();
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private logger = inject(LoggerService);
  private readonly TOKEN_KEY = 'dindinho_token';
  private readonly REFRESH_TOKEN_KEY = 'dindinho_refresh_token';

  /**
   * Estado reativo do usuário atual.
   *
   * @description
   * Signal que contém o estado do usuário autenticado ou null se não houver sessão ativa.
   * O estado é automaticamente restaurado do localStorage na inicialização.
   *
   * @example
   * // Assinando mudanças no estado do usuário
   * effect(() => {
   *   const user = authService.currentUser();
   * });
   *
   * @type {Signal<UserState | null>}
   * @readonly
   */
  readonly currentUser = signal<UserState | null>(this.tryRestoreSession());

  /**
   * Realiza o login do usuário
   *
   * @param {LoginDTO} credentials - Credenciais do usuário (email e senha)
   * @returns {Observable<LoginResponseDTO>} Observable com a resposta completa do login (token e usuário)
   *
   * @description
   * Processo de autenticação:
   * 1. Envia as credenciais para a API
   * 2. Valida e armazena o token JWT no localStorage
   * 3. Decodifica o token para extrair dados do usuário
   * 4. Atualiza o estado reativo do usuário atual
   * 5. Redireciona para o dashboard
   *
   * @example
   * ```typescript
   * this.auth.login({ email: 'user@example.com', password: 'password' }).subscribe({
   *   next: (response) => {
   *     // Redirecionamento é feito automaticamente
   *   },
   *   error: (error) => {
   *     // O erro é tratado globalmente, mas pode ser capturado aqui para lógica local
   *   }
   * });
   * ```
   */
  login(credentials: LoginDTO): Observable<LoginResponseDTO> {
    return this.api.login(credentials).pipe(
      tap((response: LoginResponseDTO) => {
        // Armazena os tokens e atualiza o estado do usuário
        this.storeTokens(response.token, response.refreshToken);
        this.currentUser.set(response.user);
        this.logger.info(`Usuário ${response.user.email} logado com sucesso.`);

        // Redireciona para o dashboard
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        // Limpa estado em caso de qualquer erro de autenticação
        this.clearAuthState();
        // Mapeia o erro para AppError (idempotente se já for AppError)
        const appError = ErrorMapper.fromUnknown(error);
        return throwError(() => appError);
      }),
    );
  }

  /**
   * Realiza cadastro de novo usuário.
   * @param data Dados do usuário
   * @returns Observable com resultado
   */
  signup(data: CreateUserDTO): Observable<unknown> {
    return this.api.signup(data);
  }

  joinWaitlist(data: CreateWaitlistDTO): Observable<{ message: string }> {
    return this.api.joinWaitlist(data);
  }

  /**
   * Realiza o logout do usuário de forma segura.
   *
   * @description
   * Processo de logout:
   * 1. Remove o token JWT do localStorage
   * 2. Limpa o estado reativo do usuário atual
   * 3. Redireciona para a página de login
   *
   * Este método é idempotente e seguro para chamadas múltiplas.
   *
   * @example
   * ```typescript
   * // Realiza logout e redireciona para a página de login
   * authService.logout();
   * ```
   */
  logout(): void {
    this.clearAuthState();
    this.router.navigate(['/login']);
  }

  /**
   * Tenta renovar o token de acesso.
   *
   * @returns {Observable<string>} Observable com o novo token de acesso
   */
  refreshToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.api.refresh(refreshToken).pipe(
      tap((response: RefreshResponse) => {
        this.storeTokens(response.token, response.refreshToken);
      }),
      map((response: RefreshResponse) => response.token),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Verifica se o usuário está autenticado com uma sessão válida.
   *
   * @returns {boolean} true se o usuário estiver autenticado com sessão válida, false caso contrário
   *
   * @description
   * Verifica se existe um usuário autenticado atualmente.
   * Esta verificação garante que não apenas há um usuário no estado,
   * mas também que sua sessão está potencialmente válida.
   *
   * Nota: A validade real do token (expiração) é verificada durante
   * a decodificação e restauração da sessão.
   *
   * @example
   * ```typescript
   * if (authService.isAuthenticated()) {
   *   // Usuário está autenticado com sessão válida
   *   // Proteger rotas ou executar ações autenticadas
   * }
   * ```
   */
  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /**
   * Tenta restaurar a sessão do usuário a partir do token armazenado.
   *
   * @private
   * @returns {UserState | null} O estado do usuário se a sessão for válida, null caso contrário
   *
   * @description
   * Processo de restauração de sessão:
   * 1. Verifica se estamos em ambiente de navegador (SSR-safe)
   * 2. Recupera o token do localStorage
   * 3. Decodifica e valida o token
   * 4. Se inválido ou expirado, limpa o storage
   * 5. Retorna o usuário se a sessão for válida
   *
   * Tratamento de erros:
   * - Erros de localStorage são tratados silenciosamente
   * - Tokens inválidos são removidos do storage
   * - Erros de decodificação são registrados no console
   *
   * Este método é chamado automaticamente na inicialização do serviço.
   */
  private tryRestoreSession(): UserState | null {
    try {
      // 1. Verifica ambiente de navegador (SSR/Testes)
      if (typeof localStorage === 'undefined') {
        return null;
      }

      const token = localStorage.getItem(this.TOKEN_KEY);
      if (!token) {
        return null; // Sem token, sem sessão
      }

      // 2. Decodifica e valida o token
      const user = this.decodeToken(token);

      // 3. Se o token for inválido ou expirado, limpa o storage
      if (!user) {
        localStorage.removeItem(this.TOKEN_KEY);
        return null;
      }

      return user;
    } catch (err) {
      // Em caso de erro crítico, limpa o estado para segurança
      this.logger.error('Erro ao restaurar sessão:', err);
      this.clearAuthState();
      return null;
    }
  }

  /**
   * Decodifica e valida um token JWT de forma segura.
   *
   * @private
   * @param {string} token - O token JWT a ser decodificado
   * @returns {UserState | null} O estado do usuário se o token for válido, null caso contrário
   *
   * @throws {AuthError.TOKEN_INVALID} Quando o token está malformado
   * @throws {AuthError.TOKEN_EXPIRED} Quando o token está expirado
   *
   * @description
   * Processo de validação do token:
   * 1. Verifica formato básico do token
   * 2. Decodifica o payload JWT
   * 3. Verifica expiração do token
   * 4. Extrai e valida dados do usuário
   * 5. Retorna estado formatado do usuário
   *
   * Tratamento de erros:
   * - Tokens malformados: registrados e retornam null
   * - Tokens expirados: registrados e retornam null
   * - Dados incompletos: registrados e retornam null
   *
   * @example
   * ```typescript
   * const user = this.decodeToken(token);
   * if (user) {
   *   // Token válido
   * } else {
   *   // Token inválido ou expirado
   * }
   * ```
   */
  private decodeToken(token: string): UserState | null {
    try {
      // 1. Validação básica do formato
      if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        return null;
      }

      // 2. Decodificação segura
      const decoded = jwtDecode<JwtPayload>(token);

      // 3. Validação do payload
      if (!decoded || !decoded.sub || !decoded.name || !decoded.email || !decoded.role) {
        return null;
      }

      // 4. Verificação de expiração
      const now = Date.now() / 1000;
      if (!decoded.exp || decoded.exp < now) {
        return null;
      }

      return {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (err) {
      this.logger.debug('Falha ao decodificar token:', err);
      return null;
    }
  }

  /**
   * Armazena os tokens JWT de forma segura no localStorage.
   *
   * @private
   * @param {string} token - O token de acesso
   * @param {string} refreshToken - O refresh token
   * @throws {AuthError.STORAGE_ERROR} Quando não é possível armazenar os tokens
   */
  private storeTokens(token: string, refreshToken: string): void {
    if (typeof localStorage === 'undefined') {
      this.logger.warn('localStorage não disponível para armazenar tokens');
      return;
    }

    if (!token || !refreshToken) {
      this.logger.error('Tentativa de armazenar tokens inválidos');
      return;
    }

    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Recupera o refresh token do armazenamento.
   *
   * @returns {string | null} O refresh token ou null se não existir
   */
  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Limpa o estado de autenticação de forma segura.
   *
   * @private
   * @description
   * Remove os tokens do localStorage e limpa o estado do usuário.
   * Trata erros de localStorage de forma silenciosa para não
   * interromper o fluxo de logout.
   */
  private clearAuthState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      } catch (err) {
        this.logger.debug('Erro ao limpar localStorage:', err);
      }
    }

    this.currentUser.set(null);
  }
}
