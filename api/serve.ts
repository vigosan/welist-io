import { serve } from "@hono/node-server";
import { loadEnvFile } from "process";

try { loadEnvFile(".env.local"); } catch {}

const { app } = await import("./app.ts");

serve({ fetch: app.fetch, port: 3001 }, () =>
  console.log("API → http://localhost:3001"),
);
