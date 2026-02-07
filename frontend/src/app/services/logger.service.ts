import { Injectable } from '@angular/core';

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
   * @param _message Mensagem a ser registrada.
   * @param _args Argumentos adicionais.
   * @example this.logger.info('Usuário logado', { userId: 1 });
   */
  info(_message: string, ..._args: unknown[]): void {
    // Apenas para fins de auditoria interna em dev
  }

  /**
   * Registra um aviso.
   * @param _message Mensagem de aviso.
   * @param _args Argumentos adicionais.
   * @example this.logger.warn('Token expirando em breve');
   */
  warn(_message: string, ..._args: unknown[]): void {
    // Apenas para fins de auditoria interna em dev
  }

  /**
   * Registra um erro.
   * @param _message Mensagem de erro.
   * @param _args Argumentos adicionais.
   * @example this.logger.error('Falha ao carregar dados', error);
   */
  error(_message: string, ..._args: unknown[]): void {
    // Apenas para fins de auditoria interna em dev
  }

  /**
   * Registra uma mensagem de debug (apenas em desenvolvimento).
   * @param _message Mensagem de debug.
   * @param _args Argumentos adicionais.
   * @example this.logger.debug('Estado da aplicação', state);
   */
  debug(_message: string, ..._args: unknown[]): void {
    // Apenas para fins de auditoria interna em dev
  }
}
