import { cors } from "hono/cors";

/**
 * Allow bundled mobile shells and PWAs to call this server from a different origin.
 * Reflects the request Origin and enables credentials (session cookies).
 */
export const mobileShellCors = cors({
  origin: (origin) => origin ?? "*",
  credentials: true,
  allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
});
