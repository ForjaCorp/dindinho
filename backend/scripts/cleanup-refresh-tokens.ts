import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { RefreshTokenService } from "../src/auth/refresh-token.service";

async function main() {
  const service = new RefreshTokenService(prisma, console);
  try {
    const count = await service.cleanupExpiredTokens();
    console.log(`Cleanup finished. Removed ${count} expired refresh tokens.`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Cleanup failed", err);
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
