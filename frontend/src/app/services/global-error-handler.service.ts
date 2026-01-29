import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { ErrorMapper } from '../utils/error-mapper';

/**
 * Handler global para erros não capturados na aplicação.
 * Garante que todos os erros sejam logados de forma consistente.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);

  /**
   * Captura erros globais e realiza o logging.
   * @param error O erro capturado pelo Angular.
   */
  handleError(error: unknown): void {
    const appError = ErrorMapper.fromUnknown(error);

    // Logar o erro técnico detalhado para depuração
    this.logger.error('Erro não capturado:', {
      message: appError.message,
      type: appError.type,
      originalError: error,
    });

    // Em produção, aqui poderíamos enviar para um serviço como Sentry ou LogRocket
  }
}
