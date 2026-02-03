export const HTTP_ERROR_BY_STATUS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export const getHttpErrorLabel = (statusCode: number): string =>
  HTTP_ERROR_BY_STATUS[statusCode] ?? "Error";
