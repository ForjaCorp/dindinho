import { describe, it, expect } from "vitest";
import { backlogItemSchema, BacklogItemDTO } from "./backlog-item.schema";

describe("backlogItemSchema", () => {
  const validData: BacklogItemDTO = {
    id: "item-1",
    type: "story",
    title: "Implementar feature X",
    problem: "O usuário não consegue fazer Y.",
    constraints: ["Deve rodar no browser Z."],
    acceptance: ["O usuário pode clicar no botão A."],
    status: "planned",
    priority: "p1",
    mvp: true,
    owners: ["user-1"],
    dependencies: ["item-2"],
    links: {
      docs: ["doc-1"],
      issues: ["issue-123"],
      pullRequests: ["pr-456"],
    },
  };

  it("deve validar um item de backlog correto", () => {
    const result = backlogItemSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("deve aplicar valores padrão", () => {
    const minimalData = {
      id: "item-2",
      type: "epic",
      title: "Nova Jornada do Usuário",
      problem: "A jornada atual é confusa.",
      owners: ["user-2"],
    };
    const result = backlogItemSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("idea");
      expect(result.data.priority).toBe("p2");
      expect(result.data.mvp).toBe(false);
      expect(result.data.constraints).toEqual([]);
      expect(result.data.acceptance).toEqual([]);
      expect(result.data.dependencies).toEqual([]);
      expect(result.data.links).toEqual({
        docs: [],
        issues: [],
        pullRequests: [],
      });
    }
  });

  it("deve falhar com um tipo inválido", () => {
    const result = backlogItemSchema.safeParse({
      ...validData,
      type: "invalid-type",
    });
    expect(result.success).toBe(false);
  });

  it("deve falhar com um status inválido", () => {
    const result = backlogItemSchema.safeParse({
      ...validData,
      status: "invalid-status",
    });
    expect(result.success).toBe(false);
  });

  it("deve falhar com um array de owners vazio", () => {
    const result = backlogItemSchema.safeParse({ ...validData, owners: [] });
    expect(result.success).toBe(false);
  });

  it("deve falhar com uma descrição de problema curta", () => {
    const result = backlogItemSchema.safeParse({
      ...validData,
      problem: "short",
    });
    expect(result.success).toBe(false);
  });
});
