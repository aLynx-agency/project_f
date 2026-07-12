import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appHealthChecks = pgTable("app_health_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export * from "./auth";
