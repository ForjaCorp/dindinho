import { describe, expect, it } from "vitest";
import { apiErrorResponseSchema } from "./error.schema";

describe("error.schema", () => {
  describe("apiErrorResponseSchema", () => {
    it("deve aceitar o envelope mínimo de erro", () => {
      expect(
        apiErrorResponseSchema.parse({
          statusCode: 400,
          error: "Bad Request",
          message: "Dados inválidos",
        }),
      ).toEqual({
        statusCode: 400,
        error: "Bad Request",
        message: "Dados inválidos",
      });
    });

    it("deve aceitar code e requestId", () => {
      expect(
        apiErrorResponseSchema.parse({
          statusCode: 404,
          error: "Not Found",
          message: "Conta não encontrada",
          code: "ACCOUNT_NOT_FOUND",
          requestId: "req-123",
        }),
      ).toEqual({
        statusCode: 404,
        error: "Not Found",
        message: "Conta não encontrada",
        code: "ACCOUNT_NOT_FOUND",
        requestId: "req-123",
      });
    });

    it("deve rejeitar code fora do padrão", () => {
      expect(() =>
        apiErrorResponseSchema.parse({
          statusCode: 401,
          error: "Unauthorized",
          message: "Não autorizado",
          code: "invalid_code",
        }),
      ).toThrow();
    });

    it("deve aceitar issues com campos extras", () => {
      expect(
        apiErrorResponseSchema.parse({
          statusCode: 400,
          error: "Bad Request",
          message: "Payload inválido",
          issues: [
            {
              code: "custom",
              message: "Campo obrigatório",
              path: ["name"],
              received: null,
            },
          ],
        }),
      ).toEqual({
        statusCode: 400,
        error: "Bad Request",
        message: "Payload inválido",
        issues: [
          {
            code: "custom",
            message: "Campo obrigatório",
            path: ["name"],
            received: null,
          },
        ],
      });
    });

    it("deve rejeitar campos extras no topo", () => {
      expect(() =>
        apiErrorResponseSchema.parse({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Erro interno",
          extra: true,
        }),
      ).toThrow();
    });
  });
});
