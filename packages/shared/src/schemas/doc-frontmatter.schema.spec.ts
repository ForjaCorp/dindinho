import { describe, it, expect } from "vitest";
import {
  docFrontmatterSchema,
  DocFrontmatterDTO,
} from "./doc-frontmatter.schema";

describe("docFrontmatterSchema", () => {
  const validData: DocFrontmatterDTO = {
    id: "doc-1",
    title: "Documento de Teste",
    description: "Uma descrição de teste.",
    audience: ["dev"],
    visibility: "internal",
    status: "draft",
    owners: ["user-1"],
    tags: ["tag1", "tag2"],
    mvp: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-02",
    links: {
      repoPaths: ["/path/to/repo"],
      relatedDocs: ["doc-2"],
      endpoints: ["/api/test"],
    },
  };

  it("deve validar um objeto frontmatter correto", () => {
    const result = docFrontmatterSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("deve aplicar valores padrão", () => {
    const minimalData = {
      id: "doc-2",
      title: "Minimal Doc",
      audience: ["product"],
      owners: ["user-2"],
      createdAt: "2024-02-01",
    };
    const result = docFrontmatterSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("internal");
      expect(result.data.status).toBe("draft");
      expect(result.data.mvp).toBe(false);
      expect(result.data.tags).toEqual([]);
      expect(result.data.links).toEqual({
        repoPaths: [],
        relatedDocs: [],
        endpoints: [],
      });
    }
  });

  it("deve falhar com um id inválido", () => {
    const result = docFrontmatterSchema.safeParse({ ...validData, id: "a" });
    expect(result.success).toBe(false);
  });

  it("deve falhar com um audience inválido", () => {
    const result = docFrontmatterSchema.safeParse({
      ...validData,
      audience: ["invalid-audience"],
    });
    expect(result.success).toBe(false);
  });

  it("deve falhar com um array de owners vazio", () => {
    const result = docFrontmatterSchema.safeParse({ ...validData, owners: [] });
    expect(result.success).toBe(false);
  });

  it("deve falhar com um formato de data inválido", () => {
    const result = docFrontmatterSchema.safeParse({
      ...validData,
      createdAt: "01-01-2024",
    });
    expect(result.success).toBe(false);
  });
});
