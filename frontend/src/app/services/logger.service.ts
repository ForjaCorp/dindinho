import { Injectable, isDevMode } from '@angular/core';

/**
 * Serviço de logging para a aplicação frontend.
 * Em modo de produção, apenas erros e avisos são exibidos no console.
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  /**
   * Registra uma mensagem informativa.
   * @param message Mensagem a ser registrada.
   * @param args Argumentos adicionais.
   * @example this.logger.info('Usuário logado', { userId: 1 });
   */
  info(message: string, ...args: unknown[]): void {
    if (isDevMode()) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Registra um aviso.
   * @param message Mensagem de aviso.
   * @param args Argumentos adicionais.
   * @example this.logger.warn('Token expirando em breve');
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Registra um erro.
   * @param message Mensagem de erro.
   * @param args Argumentos adicionais.
   * @example this.logger.error('Falha ao carregar dados', error);
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Registra uma mensagem de debug (apenas em desenvolvimento).
   * @param message Mensagem de debug.
   * @param args Argumentos adicionais.
   * @example this.logger.debug('Estado da aplicação', state);
   */
  debug(message: string, ...args: unknown[]): void {
    if (isDevMode()) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}
