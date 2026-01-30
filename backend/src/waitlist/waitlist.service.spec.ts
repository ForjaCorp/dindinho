import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaitlistService } from "./waitlist.service";
import { PrismaClient, Waitlist } from "@prisma/client";

describe("WaitlistService", () => {
  let service: WaitlistService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = {
      waitlist: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    } as unknown as PrismaClient;
    service = new WaitlistService(prisma);
  });

  it("deve adicionar um usuário à lista de espera com sucesso", async () => {
    const input = {
      name: "Teste",
      email: "teste@exemplo.com",
      phone: "11999999999",
    };

    const expectedResult = {
      id: "uuid",
      ...input,
      status: "PENDING",
      createdAt: new Date(),
    };

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.waitlist.create).mockResolvedValue(
      expectedResult as unknown as Waitlist,
    );

    const result = await service.join(input);

    expect(result).toEqual(expectedResult);
    expect(prisma.waitlist.findUnique).toHaveBeenCalledWith({
      where: { email: input.email },
    });
    expect(prisma.waitlist.create).toHaveBeenCalledWith({
      data: input,
    });
  });

  it("deve lançar erro se o email já estiver na lista", async () => {
    const input = {
      name: "Teste",
      email: "teste@exemplo.com",
      phone: "11999999999",
    };

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue({
      id: "1",
    } as unknown as Waitlist);

    await expect(service.join(input)).rejects.toThrow(
      "Email já está na lista de espera.",
    );
  });

  it("deve normalizar o email antes de verificar e salvar", async () => {
    const input = {
      name: "Teste",
      email: "  TESTE@EXEMPLO.COM  ",
      phone: "11999999999",
    };

    vi.mocked(prisma.waitlist.findUnique).mockResolvedValue(null);

    await service.join(input);

    const expectedEmail = "teste@exemplo.com";

    expect(prisma.waitlist.findUnique).toHaveBeenCalledWith({
      where: { email: expectedEmail },
    });
    expect(prisma.waitlist.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: expectedEmail }),
    });
  });
});
