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
  const email = "dev@dindinho.com";
  const password = "Password123!";

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
    if (existingUser.role !== "ADMIN") {
      await prisma.user.update({
        where: { email },
        data: { role: "ADMIN" },
      });
      writeOut(`Role do usuário ${email} atualizada para ADMIN`);
    } else {
      writeOut(`Usuário de dev já existe e é ADMIN: ${email}`);
    }
    return;
  }

  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    writeOut(
      "Seed de usuário dev ignorado fora do ambiente de desenvolvimento",
    );
    return;
  }

  const passwordHash = await hash(password, 8);

  const user = await prisma.user.create({
    data: {
      name: "Desenvolvedor Dindinho",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  writeOut(`Usuário de dev criado com sucesso: ${user.email}`);
  writeOut(`Senha: ${password}`);
}
