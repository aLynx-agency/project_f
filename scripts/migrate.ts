import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { max: 1 });

migrate(drizzle(client), { migrationsFolder: "./migrations" })
  .then(() => client.end())
  .then(() => {
    console.log("Migrations complete");
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
