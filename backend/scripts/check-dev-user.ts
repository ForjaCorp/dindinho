#!/usr/bin/env node

/**
 * Script utilitário para verificar se o usuário de desenvolvimento existe
 * Uso: npm run check:dev-user
 */

import { prisma } from "../src/lib/prisma";

const writeOut = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const writeErr = (message: string) => {
  process.stderr.write(`${message}\n`);
};

async function main() {
  const email = "dev@dindinho.com";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        createdAt: true,
      },
    });

    if (user) {
      writeOut("Usuário de desenvolvimento encontrado:");
      writeOut(`   ID: ${user.id}`);
      writeOut(`   Email: ${user.email}`);
      writeOut(`   Nome: ${user.name}`);
      writeOut(`   System Role: ${user.systemRole}`);
      writeOut(`   Criado em: ${user.createdAt}`);
      writeOut("\nCredenciais padrão:");
      writeOut(`   Email: ${email}`);
      writeOut("   Senha: Password123!");
    } else {
      writeOut("Usuário de desenvolvimento não encontrado");
      writeOut(
        "\nExecute 'npm run seed' para criar o usuário de desenvolvimento",
      );
    }
  } catch (error) {
    writeErr("Erro ao buscar usuário");
    if (error instanceof Error) {
      writeErr(error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
