import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { LoginDTO, LoginResponseDTO } from '@dindinho/shared';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

/**
 * Erros específicos do serviço de autenticação
 */
export enum AuthError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

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
 *   error: (err) => console.error('Falha no login', err)
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
 *   console.log('Usuário atual:', user);
 * });
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
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
   *   console.log('Estado do usuário mudou:', user);
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
   * @throws {AuthError.INVALID_CREDENTIALS} Quando as credenciais são inválidas
   * @throws {AuthError.NETWORK_ERROR} Quando há erro de comunicação com a API
   * @throws {AuthError.STORAGE_ERROR} Quando não é possível armazenar o token
   * @throws {AuthError.TOKEN_INVALID} Quando o token recebido é inválido
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
   *     console.log('Login bem-sucedido:', response.user);
   *     // Redirecionamento é feito automaticamente
   *   },
   *   error: (error) => {
   *     if (error.type === AuthError.INVALID_CREDENTIALS) {
   *       console.log('Credenciais inválidas');
   *     }
   *   }
   * });
   * ```
   */
  login(credentials: LoginDTO): Observable<LoginResponseDTO> {
    return this.api.login(credentials).pipe(
      tap((response) => {
        // Armazena os tokens e atualiza o estado do usuário
        this.storeTokens(response.token, response.refreshToken);
        this.currentUser.set(response.user);

        // Redireciona para o dashboard
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        console.error('Erro durante login:', error);

        // Limpa estado em caso de qualquer erro
        this.clearAuthState();

        // Mapeia erros da API para tipos de erro específicos
        let authError: AuthError;

        if (error?.status === 401) {
          authError = AuthError.INVALID_CREDENTIALS;
        } else if (error?.status === 0 || error?.message?.includes('network')) {
          authError = AuthError.NETWORK_ERROR;
        } else if (error?.message === AuthError.STORAGE_ERROR) {
          authError = AuthError.STORAGE_ERROR;
        } else {
          authError = AuthError.UNKNOWN_ERROR;
        }

        return throwError(() => ({
          type: authError,
          message: this.getErrorMessage(authError),
          originalError: error,
        }));
      }),
    );
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
    try {
      this.clearAuthState();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro durante logout:', error);
      // Força redirecionamento mesmo em caso de erro
      this.router.navigate(['/login']);
    }
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
      tap((response) => {
        this.storeTokens(response.token, response.refreshToken);
      }),
      map((response) => response.token),
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
        console.warn('localStorage não disponível - sessão não será restaurada');
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
        console.warn('Token inválido ou expirado encontrado - limpando storage');
        localStorage.removeItem(this.TOKEN_KEY);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Erro inesperado ao restaurar sessão:', error);
      // Em caso de erro crítico, limpa o estado para segurança
      try {
        localStorage.removeItem(this.TOKEN_KEY);
      } catch {
        // Silently ignore localStorage errors during cleanup
      }
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
   *   console.log('Token válido para:', user.email);
   * } else {
   *   console.log('Token inválido ou expirado');
   * }
   * ```
   */
  private decodeToken(token: string): UserState | null {
    try {
      // 1. Validação básica do formato
      if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        console.error('Token JWT malformado: formato inválido');
        return null;
      }

      // 2. Decodificação segura
      const decoded = jwtDecode<JwtPayload>(token);

      // 3. Validação do payload
      if (!decoded || !decoded.sub || !decoded.name || !decoded.email || !decoded.role) {
        console.error('Token JWT incompleto: dados obrigatórios ausentes');
        return null;
      }

      // 4. Verificação de expiração
      const now = Date.now() / 1000;
      if (!decoded.exp || decoded.exp < now) {
        const expirationTime = decoded.exp
          ? new Date(decoded.exp * 1000).toISOString()
          : 'desconhecida';
        console.warn(
          `Token JWT expirado. Expiração: ${expirationTime}, Atual: ${new Date().toISOString()}`,
        );
        return null;
      }

      // 5. Retorno do estado do usuário
      return {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Erro na decodificação JWT:', error.message);
      } else {
        console.error('Erro inesperado ao decodificar token:', error);
      }
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
    try {
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage não disponível');
      }

      if (!token || !refreshToken) {
        throw new Error('Tokens inválidos para armazenamento');
      }

      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Erro ao armazenar tokens:', error);
      throw new Error(AuthError.STORAGE_ERROR);
    }
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
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Erro ao limpar tokens do localStorage:', error);
    }

    this.currentUser.set(null);
  }

  /**
   * Retorna mensagem de erro amigável baseada no tipo de erro.
   *
   * @private
   * @param {AuthError} errorType - Tipo do erro de autenticação
   * @returns {string} Mensagem de erro amigável
   */
  private getErrorMessage(errorType: AuthError): string {
    switch (errorType) {
      case AuthError.INVALID_CREDENTIALS:
        return 'Email ou senha incorretos. Verifique suas credenciais.';
      case AuthError.TOKEN_EXPIRED:
        return 'Sua sessão expirou. Faça login novamente.';
      case AuthError.TOKEN_INVALID:
        return 'Sessão inválida. Faça login novamente.';
      case AuthError.NETWORK_ERROR:
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case AuthError.STORAGE_ERROR:
        return 'Erro ao salvar sessão. Verifique as configurações do navegador.';
      case AuthError.UNKNOWN_ERROR:
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }
}
