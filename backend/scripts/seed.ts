import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const email = "dev@dindinho.com";
  const password = "Password123!"; // Senha forte para dev

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
