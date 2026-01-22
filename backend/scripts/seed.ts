import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const email = "dev@dindinho.com";
  const password = "Password123!"; // Senha forte para dev

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

  const passwordHash = await hash(password, 8);

  const user = await prisma.user.create({
    data: {
      name: "Desenvolvedor Dindinho",
      email,
      passwordHash,
    },
  });

  console.log(`Usuário de dev criado com sucesso: ${user.email}`);
  console.log(`Senha: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
