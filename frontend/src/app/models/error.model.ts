/**
 * Tipos de erro suportados pela aplicação.
 */
export type ErrorType = 'HTTP' | 'VALIDATION' | 'AUTH' | 'UNKNOWN';

/**
 * Interface que representa um erro padronizado na aplicação.
 */
export interface AppError {
  /** Tipo do erro. */
  type: ErrorType;
  /** Mensagem amigável para o usuário. */
  message: string;
  /** Código do erro (ex: status HTTP ou código interno). */
  code?: string | number;
  /** Detalhes técnicos do erro (opcional). */
  details?: unknown;
  /** Erro original (opcional). */
  originalError?: unknown;
}
