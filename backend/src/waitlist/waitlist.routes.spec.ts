import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { Waitlist } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

import { buildApp } from "../app";
import { prisma } from "../lib/prisma";
import { PrismaClient } from "@prisma/client";

vi.mock("../lib/prisma", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe("WaitlistRoutes", () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar 201 ao solicitar convite com sucesso", async () => {
    const payload = {
      name: "Teste",
      email: "teste@exemplo.com",
      phone: "+5511999999999",
    };

    prismaMock.waitlist.findUnique.mockResolvedValue(null);
    prismaMock.waitlist.create.mockResolvedValue({
      id: "123",
      ...payload,
      status: "PENDING",
      createdAt: new Date(),
    } as unknown as Waitlist);

    const response = await app.inject({
      method: "POST",
      url: "/api/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      message:
        "Solicitação recebida com sucesso! Em breve entraremos em contato.",
    });
  });

  it("deve retornar 409 se o email já estiver na lista", async () => {
    const payload = {
      name: "Teste",
      email: "existente@exemplo.com",
      phone: "+5511999999999",
    };

    prismaMock.waitlist.findUnique.mockResolvedValue({
      id: "1",
    } as unknown as Waitlist);

    const response = await app.inject({
      method: "POST",
      url: "/api/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: "Conflict",
        message: "Email já está na lista de espera.",
        code: "WAITLIST_EMAIL_ALREADY_EXISTS",
      }),
    );
  });

  it("deve retornar 422 se os dados forem inválidos", async () => {
    const payload = {
      name: "A", // Muito curto
      email: "invalid-email",
      // phone missing
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/waitlist",
      payload,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual(
      expect.objectContaining({
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "Os dados fornecidos são inválidos.",
      }),
    );
  });
});
