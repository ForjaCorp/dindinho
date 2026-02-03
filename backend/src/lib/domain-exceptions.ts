export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = "Sem permissão") {
    super(message);
  }
}

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Recurso não encontrado") {
    super(message);
  }
}
