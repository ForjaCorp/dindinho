import { describe, it, expect } from "vitest";
import {
  SystemRole,
  ResourcePermission,
  loginSchema,
  loginResponseSchema,
} from "./auth.schema";

describe("Auth Schemas (Shared)", () => {
  describe("Enums", () => {
    it("deve ter SystemRole com os valores corretos", () => {
      expect(SystemRole.USER).toBe("USER");
      expect(SystemRole.ADMIN).toBe("ADMIN");
    });

    it("deve ter ResourcePermission com os valores corretos", () => {
      expect(ResourcePermission.VIEWER).toBe("VIEWER");
      expect(ResourcePermission.EDITOR).toBe("EDITOR");
      expect(ResourcePermission.OWNER).toBe("OWNER");
    });
  });

  describe("loginSchema", () => {
    it("deve validar um login válido", () => {
      const validData = {
        email: "test@example.com",
        password: "password123",
      };
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("deve falhar se o email for inválido", () => {
      const invalidData = {
        email: "not-an-email",
        password: "password123",
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Email inválido");
      }
    });

    it("deve falhar se a senha estiver vazia", () => {
      const invalidData = {
        email: "test@example.com",
        password: "",
      };
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Senha é obrigatória");
      }
    });
  });

  describe("loginResponseSchema", () => {
    it("deve validar uma resposta de login válida", () => {
      const validResponse = {
        token: "token-jwt",
        refreshToken: "refresh-token-jwt",
        user: {
          id: "user-id",
          name: "User Name",
          email: "user@example.com",
          systemRole: SystemRole.USER,
        },
      };
      const result = loginResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("deve falhar se o systemRole for inválido", () => {
      const invalidResponse = {
        token: "token-jwt",
        refreshToken: "refresh-token-jwt",
        user: {
          id: "user-id",
          name: "User Name",
          email: "user@example.com",
          systemRole: "INVALID_ROLE",
        },
      };
      const result = loginResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it("deve falhar se campos obrigatórios estiverem ausentes", () => {
      const incompleteResponse = {
        token: "token-jwt",
        user: {
          id: "user-id",
          name: "User Name",
        },
      };
      const result = loginResponseSchema.safeParse(incompleteResponse);
      expect(result.success).toBe(false);
    });
  });
});
