import { main } from "../src/scripts/seed";
import { prisma } from "../src/lib/prisma";

const writeErr = (message: string) => {
  process.stderr.write(`${message}\n`);
};

if (require.main === module) {
  main()
    .catch((e) => {
      if (e instanceof Error) {
        writeErr(e.message);
      } else {
        writeErr("Erro desconhecido ao rodar seed");
      }
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
