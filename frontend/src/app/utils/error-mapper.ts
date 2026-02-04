import { HttpErrorResponse } from '@angular/common/http';
import { AppError } from '../models/error.model';
import { apiErrorResponseSchema, ApiErrorResponseDTO } from '@dindinho/shared';

/**
 * Utilitário para mapear erros técnicos em erros padronizados da aplicação.
 */
export class ErrorMapper {
  /**
   * Converte um HttpErrorResponse em um AppError.
   * @param error O erro retornado pelo HttpClient.
   * @returns Um objeto AppError formatado.
   */
  static fromHttpError(error: HttpErrorResponse): AppError {
    let message = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
    let type: AppError['type'] = 'HTTP';
    let apiError: ApiErrorResponseDTO | null = null;

    // Tentativa defensiva de parsear o erro usando o schema do shared
    try {
      if (error.error) {
        const result = apiErrorResponseSchema.safeParse(error.error);
        if (result.success) {
          apiError = result.data;
        } else if (typeof error.error === 'object' && error.error !== null) {
          // Fallback parcial se o schema falhar mas for um objeto
          apiError = {
            statusCode: error.status,
            error: error.error.error || 'Unknown Error',
            message: error.error.message || message,
            code: error.error.code,
            requestId: error.error.requestId,
            issues: error.error.issues,
            details: error.error.details,
          };
        }
      }
    } catch {
      // Ignora erros de parse
    }

    if (apiError?.message) {
      message = apiError.message;
    }

    if (error.status === 0) {
      message = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    } else if (error.status === 401) {
      if (!apiError?.message) {
        message = 'Sessão expirada ou não autorizada. Por favor, faça login novamente.';
      }
      type = 'AUTH';
    } else if (error.status === 403) {
      if (!apiError?.message) {
        message = 'Você não tem permissão para realizar esta ação.';
      }
    } else if (error.status === 404) {
      if (!apiError?.message) {
        message = 'O recurso solicitado não foi encontrado.';
      }
    } else if (error.status === 409) {
      if (!apiError?.message) {
        message = 'Este recurso já existe ou está em conflito.';
      }
    } else if (
      error.status === 422 ||
      (error.status === 400 && apiError?.code === 'VALIDATION_ERROR')
    ) {
      type = 'VALIDATION';
    } else if (error.status === 429) {
      message = 'Muitas requisições. Tente novamente em alguns minutos.';
    } else if (error.status >= 500) {
      if (!apiError?.message || error.status === 500) {
        message = 'Erro no servidor. Estamos trabalhando para resolver.';
      }
    }

    return {
      type,
      message,
      code: apiError?.code || error.status,
      requestId: apiError?.requestId,
      issues: apiError?.issues,
      details: apiError?.details || error.error,
      originalError: error,
    };
  }

  /**
   * Converte um erro genérico em um AppError.
   * @param error Erro desconhecido.
   * @returns Um objeto AppError formatado.
   */
  static fromUnknown(error: unknown): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    if (
      error instanceof HttpErrorResponse ||
      (error && typeof error === 'object' && 'status' in error)
    ) {
      return this.fromHttpError(error as HttpErrorResponse);
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    return {
      type: 'UNKNOWN',
      message: message || 'Ocorreu um erro inesperado.',
      originalError: error,
    };
  }

  /**
   * Verifica se um objeto é um AppError.
   * @param error Objeto a ser verificado.
   * @returns true se for um AppError.
   */
  private static isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      typeof (error as Record<string, unknown>)['type'] === 'string' &&
      ['HTTP', 'VALIDATION', 'AUTH', 'UNKNOWN'].includes(
        (error as Record<string, unknown>)['type'] as string,
      ) &&
      'message' in error
    );
  }
}
