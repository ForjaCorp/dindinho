import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepMockProxy, mockReset } from "vitest-mock-extended";
import { PrismaClient, Category } from "@prisma/client";

vi.mock("../lib/prisma", async () => {
  const { mockDeep } = await import("vitest-mock-extended");
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

import { buildApp } from "../app";
import { prisma } from "../lib/prisma";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("Rotas de Categorias", () => {
  let app: ReturnType<typeof buildApp>;
  let token: string;

  const userId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(async () => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    mockReset(prismaMock);

    app = buildApp();
    await app.ready();
    token = app.jwt.sign({ sub: userId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/categories", () => {
    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/categories",
      });
      expect(response.statusCode).toBe(401);
    });

    it("deve listar categorias do usuário e globais", async () => {
      const userCategoryId = "11111111-1111-1111-1111-111111111111";
      const globalCategoryId = "22222222-2222-2222-2222-222222222222";

      prismaMock.category.count.mockResolvedValue(11 as any);

      prismaMock.category.findMany.mockResolvedValue([
        {
          id: userCategoryId,
          name: "Mercado",
          icon: "pi-shopping-cart",
          parentId: null,
          userId,
        },
        {
          id: globalCategoryId,
          name: "Transporte",
          icon: "pi-car",
          parentId: null,
          userId: null,
        },
      ] as any);

      const response = await app.inject({
        method: "GET",
        url: "/api/categories",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([
        {
          id: userCategoryId,
          name: "Mercado",
          icon: "pi-shopping-cart",
          parentId: null,
          userId,
        },
        {
          id: globalCategoryId,
          name: "Transporte",
          icon: "pi-car",
          parentId: null,
          userId: null,
        },
      ]);
    });
  });

  describe("POST /api/categories", () => {
    it("deve retornar 401 sem token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/categories",
        payload: { name: "Mercado", icon: "pi-shopping-cart" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("deve criar categoria do usuário", async () => {
      const createdCategoryId = "33333333-3333-3333-3333-333333333333";
      const created: Partial<Category> = {
        id: createdCategoryId,
        name: "Mercado",
        icon: "pi-shopping-cart",
        parentId: null,
        userId,
      };

      prismaMock.category.create.mockResolvedValue(created as any);

      const response = await app.inject({
        method: "POST",
        url: "/api/categories",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Mercado", icon: "pi-shopping-cart" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toEqual(created);
      expect(prismaMock.category.create).toHaveBeenCalledTimes(1);
    });
  });
});
