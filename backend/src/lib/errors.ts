import { ApiErrorCodeDTO } from "@dindinho/shared";

/**
 * Classe base para erros de domínio da aplicação.
 * Permite capturar erros específicos e retornar status codes e códigos de erro consistentes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCodeDTO;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code?: ApiErrorCodeDTO,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Erro para recursos não encontrados (404).
 */
export class NotFoundError extends AppError {
  constructor(
    message = "Recurso não encontrado",
    code: ApiErrorCodeDTO = "NOT_FOUND",
  ) {
    super(message, 404, code);
    this.name = "NotFoundError";
  }
}

/**
 * Erro para conflitos de estado ou recursos duplicados (409).
 */
export class ConflictError extends AppError {
  constructor(message: string, code: ApiErrorCodeDTO = "CONFLICT") {
    super(message, 409, code);
    this.name = "ConflictError";
  }
}

/**
 * Erro para falhas de autenticação (401).
 */
export class UnauthorizedError extends AppError {
  constructor(
    message = "Não autorizado",
    code: ApiErrorCodeDTO = "UNAUTHORIZED",
  ) {
    super(message, 401, code);
    this.name = "UnauthorizedError";
  }
}

/**
 * Erro para falhas de permissão (403).
 */
export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado", code: ApiErrorCodeDTO = "FORBIDDEN") {
    super(message, 403, code);
    this.name = "ForbiddenError";
  }
}

/**
 * Erro para dados de entrada inválidos (400 ou 422).
 */
export class ValidationError extends AppError {
  constructor(message = "Dados inválidos", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Erro para limites excedidos (429).
 */
export class RateLimitError extends AppError {
  constructor(message = "Muitas requisições. Tente novamente mais tarde.") {
    super(message, 429, "TOO_MANY_REQUESTS");
    this.name = "RateLimitError";
  }
}
