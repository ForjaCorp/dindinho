import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { createPool } from "mariadb";
import "dotenv/config";

const app = Fastify({ logger: true });

// Validação da URL do Banco
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida no .env");
}

// 1. Parse da URL para extrair as credenciais
const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname, // Use hostname da URL, não "127.0.0.1"
  port: Number(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  connectionLimit: 10,
  connectTimeout: 20000,
  acquireTimeout: 20000,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

app.register(cors, {
  origin: "*",
});

app.get("/", async () => {
  return {
    message: "Bem-vindo à API do Dindinho! 💸",
    aviso: "Use a rota /test-db para checar o banco.",
    endpoints: {
      health: "/health",
      test_db: "/test-db",
    },
  };
});

app.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date(),
    app: "Dindinho API",
  };
});

app.get("/test-db", async () => {
  try {
    // Tenta uma query simples via Prisma
    const usersCount = await prisma.user.count();
    return {
      success: true,
      message: "Prisma conectado com sucesso!",
      usersCount,
    };
  } catch (error) {
    app.log.error(error);
    return {
      success: false,
      error: "Erro na conexão via Prisma",
      details: String(error),
    };
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await app.listen({ port, host: "0.0.0.0" });

    console.log("\n🚀 SERVIDOR ONLINE!");
    console.log(`👉 API (Correta): http://localhost:${port}`);
    console.log(`❌ BANCO (Não acessar): http://localhost:3306\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
