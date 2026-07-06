import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs its own Node-based TS loader and bypasses Bun's env loading,
// so we load .env.local explicitly here for both `bun run db:*` and `bunx drizzle-kit *`.
config({ path: ".env.local" });
config({ path: ".env", override: false });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
