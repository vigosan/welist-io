import { defineConfig } from "drizzle-kit";
import { loadEnvFile } from "process";

try { loadEnvFile(".env.local"); } catch {}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
