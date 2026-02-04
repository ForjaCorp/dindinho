import { prisma } from "../lib/prisma";

export class SignupAllowlistService {
  constructor(private readonly prismaClient: typeof prisma) {}

  async list() {
    const items = await this.prismaClient.signupAllowlist.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });

    return items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async add(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const item = await this.prismaClient.signupAllowlist.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail },
      select: { id: true, email: true, createdAt: true },
    });

    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async remove(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await this.prismaClient.signupAllowlist.deleteMany({
      where: { email: normalizedEmail },
    });

    return result.count > 0;
  }
}
