import { prisma } from "../lib/prisma";
import { hash } from "bcryptjs";

const writeOut = (message: string) => {
  process.stdout.write(`${message}\n`);
};

/**
 * Script de seed para popular o banco de dados com dados iniciais.
 * Garante a criação de categorias padrão e do usuário de desenvolvimento com permissão de ADMIN.
 */
export async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "dev@dindinho.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "Password123!";

  const defaultCategories = [
    { name: "Salário", icon: "pi-briefcase" },
    { name: "Investimento", icon: "pi-chart-line" },
    { name: "Outros Rendimentos", icon: "pi-wallet" },
    { name: "Moradia", icon: "pi-home" },
    { name: "Transporte", icon: "pi-car" },
    { name: "Saúde", icon: "pi-heart" },
    { name: "Educação", icon: "pi-book" },
    { name: "Compras", icon: "pi-shopping-cart" },
    { name: "Lazer", icon: "pi-ticket" },
    { name: "Pessoal", icon: "pi-user" },
    { name: "Outros", icon: "pi-tag" },
  ];

  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: null },
      select: { id: true },
    });
    if (!existing) {
      await prisma.category.create({
        data: { name: cat.name, icon: cat.icon, userId: null },
      });
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.systemRole !== "ADMIN") {
      await prisma.user.update({
        where: { email },
        data: { systemRole: "ADMIN" },
      });
      writeOut(`Role do usuário ${email} atualizada para ADMIN`);
    } else {
      writeOut(`Usuário de dev já existe e é ADMIN: ${email}`);
    }
  } else {
    const passwordHash = await hash(password, 8);
    const user = await prisma.user.create({
      data: {
        name: "Desenvolvedor Dindinho",
        email,
        passwordHash,
        systemRole: "ADMIN",
      },
    });
    writeOut(`Usuário de dev criado com sucesso: ${user.email}`);
    writeOut(`Senha: ${password}`);
  }

  const isDev = process.env.NODE_ENV !== "production";
  const autoSeed = process.env.AUTO_SEED === "true";

  if (!isDev && !autoSeed) {
    writeOut(
      "Seed de usuário dev ignorado fora do ambiente de desenvolvimento (use AUTO_SEED=true para forçar)",
    );
    return;
  }

  if (autoSeed) {
    writeOut("AUTO_SEED enabled, creating E2E test users...");
    const testUsers = [
      {
        email: "e2e@example.com",
        name: "E2E Test User",
        pass: "Dindinho#1234",
      },
      {
        email: "e2e-inviter@example.com",
        name: "E2E Inviter",
        pass: "Dindinho#1234",
      },
      {
        email: "e2e-invitee@example.com",
        name: "E2E Invitee",
        pass: "Dindinho#1234",
      },
    ];

    for (const tu of testUsers) {
      const existing = await prisma.user.findUnique({
        where: { email: tu.email },
      });
      if (!existing) {
        const tuHash = await hash(tu.pass, 8);
        await prisma.user.create({
          data: {
            name: tu.name,
            email: tu.email,
            passwordHash: tuHash,
            systemRole: "USER",
          },
        });
        writeOut(`Test user created: ${tu.email}`);
      }
    }
  }
}
