import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { usersRoutes } from "./users/users.routes";

export function buildApp() {
  const app = Fastify({ logger: true });

  // Configuração do Zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins
  app.register(cors, { origin: "*" });

  // Rotas
  app.register(usersRoutes);

  // Rota raiz
  app.get("/", async () => {
    return {
      message: "Bem-vindo à API do Dindinho! 💸",
      docs: "Rotas disponíveis: POST /users",
    };
  });

  return app;
}
