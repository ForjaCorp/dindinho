import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub?: string;
      name?: string;
      email?: string;
      role?: string;
    };
    user: {
      sub: string;
      name?: string;
      email?: string;
      role?: string;
    };
  }
}
