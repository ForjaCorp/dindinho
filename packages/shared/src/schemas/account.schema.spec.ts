import { describe, it, expect } from "vitest";
import { updateAccountSchema } from "./account.schema";

describe("updateAccountSchema", () => {
  it("deve rejeitar payload vazio", () => {
    expect(() => updateAccountSchema.parse({})).toThrow(
      "Informe ao menos um campo para atualização",
    );
  });

  it("deve aceitar atualização parcial de nome e aplicar trim", () => {
    const parsed = updateAccountSchema.parse({ name: "  Conta  " });
    expect(parsed).toEqual({ name: "Conta" });
  });

  it("deve aceitar números como string para dias", () => {
    const parsed = updateAccountSchema.parse({
      closingDay: "10",
      dueDay: "15",
    });

    expect(parsed).toEqual({ closingDay: 10, dueDay: 15 });
  });

  it("deve aceitar limit como string", () => {
    const parsed = updateAccountSchema.parse({ limit: "5000" });
    expect(parsed).toEqual({ limit: 5000 });
  });

  it("deve converter limit vazio para null", () => {
    const parsed = updateAccountSchema.parse({ limit: "" });
    expect(parsed).toEqual({ limit: null });
  });

  it("deve converter brand vazia para null", () => {
    const parsed = updateAccountSchema.parse({ brand: "   " });
    expect(parsed).toEqual({ brand: null });
  });
});
