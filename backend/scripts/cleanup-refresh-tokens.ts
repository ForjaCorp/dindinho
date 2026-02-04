import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { RefreshTokenService } from "../src/auth/refresh-token.service";

const formatLogArg = (arg: unknown): string => {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack ?? arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const writeOut = (...args: unknown[]) => {
  process.stdout.write(`${args.map(formatLogArg).join(" ")}\n`);
};

const writeErr = (...args: unknown[]) => {
  process.stderr.write(`${args.map(formatLogArg).join(" ")}\n`);
};

async function main() {
  const service = new RefreshTokenService(prisma, {
    info: writeOut,
    warn: writeOut,
    error: writeErr,
  });
  try {
    const count = await service.cleanupExpiredTokens();
    writeOut(`Cleanup finished. Removed ${count} expired refresh tokens.`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    writeErr("Cleanup failed");
    if (err instanceof Error) {
      writeErr(err.message);
    }
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
