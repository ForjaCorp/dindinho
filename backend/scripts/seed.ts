import { main } from "../src/scripts/seed";
import { prisma } from "../src/lib/prisma";

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
