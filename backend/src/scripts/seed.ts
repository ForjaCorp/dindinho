import { prisma } from "../lib/prisma";
import { hash } from "bcryptjs";

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
    console.log(`Usuário de dev já existe: ${email}`);
    return;
  }

  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) {
    console.log(
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

  console.log(`Usuário de dev criado com sucesso: ${user.email}`);
  console.log(`Senha: ${password}`);
}
