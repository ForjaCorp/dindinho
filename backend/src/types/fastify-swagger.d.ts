import "@fastify/swagger";
import "fastify";

declare module "fastify" {
  interface FastifySchema {
    summary?: string;
    description?: string;
    tags?: string[];
  }
}
