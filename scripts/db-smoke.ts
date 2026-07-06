import { db } from "@/db";
import { appHealthChecks } from "@/db/schema";

try {
  const [row] = await db
    .insert(appHealthChecks)
    .values({ message: "Database smoke test" })
    .returning();

  console.log("✓ Database smoke test passed:", row);
  process.exit(0);
} catch (error) {
  console.error("✗ Database smoke test failed:", error);
  process.exit(1);
}
