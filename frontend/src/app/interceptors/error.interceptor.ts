import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ErrorMapper } from '../utils/error-mapper';
import { LoggerService } from '../services/logger.service';

/**
 * Interceptor para capturar e tratar erros de requisições HTTP globalmente.
 * Mapeia erros técnicos para AppError e exibe um Toast informativo.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const appError = ErrorMapper.fromHttpError(error);

      // Logar o erro para depuração
      logger.error(`HTTP Error [${error.status}] ${req.url}:`, appError);

      // Exibir Toast para o usuário (exceto se for erro de validação silencioso, se houver lógica para isso)
      messageService.add({
        severity: appError.type === 'VALIDATION' ? 'warn' : 'error',
        summary: appError.type === 'AUTH' ? 'Autenticação' : 'Erro',
        detail: appError.message,
        life: 5000,
      });

      return throwError(() => appError);
    }),
  );
};
