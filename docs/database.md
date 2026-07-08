# Database

Drizzle ORM on Postgres 16, run via CloudNativePG (CNPG) in each namespace on the cluster and any local Postgres in dev.

## Layout

```
src/db/
  index.ts             Drizzle client (`db`) — single source of the connection pool
  schema/
    index.ts             Barrel file — re-exports every table
    <domain>.ts          One file per logical domain (users.ts, projects.ts, ...)
  migrations/          Generated SQL + journal — committed, never hand-edited
```

> **Drizzle schema** (DB tables) lives in `src/db/schema/*.ts`. **Zod schema** (input validation for forms, server actions, API) lives in `src/features/<feature>/<feature>-schema.ts`. Same word, different jobs — keep them in their respective places.

## Commands

```bash
bun run db:generate      # create migration SQL from schema diff (commit the result)
bun run db:migrate       # apply pending migrations to DATABASE_URL
bun run db:push          # dev-only: push schema without a migration — never on shared DB
bun run db:studio        # browse the DB in a local web UI
bun run db:smoke         # insert + read a row to verify connectivity
```

## Migration policy

- **Every schema change:** `db:generate` → review the generated SQL → commit the migration file alongside the schema change in the same PR.
- **Never edit a migration file after it has been applied to a shared DB** — write a new forward migration instead.
- `db:push` is for **solo prototyping only**. On shared or production DBs always use generated migrations.
- On the cluster, `db:migrate` runs **automatically** as an ArgoCD PreSync Job (`scripts/migrate.ts` bundled into the app image). A failed migration blocks the deploy and leaves the running app untouched.

## Adding a new table

```ts
// 1. src/db/schema/projects.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

```ts
// 2. Re-export from the barrel
// src/db/schema/index.ts
export * from "./app-health-checks";
export * from "./projects";
```

```bash
# 3. Generate the migration SQL
bun run db:generate

# 4. Review src/db/migrations/<new>.sql — make sure it matches your intent

# 5. Apply locally, commit the migration file in the same PR
bun run db:migrate
```

```ts
// 6. Use it from server code
import { db } from "@/db";
import { projects } from "@/db/schema";

const rows = await db.select().from(projects);
```

## Conventions

- **Table variable:** `camelCase` plural — `users`, `projectMembers`
- **Table SQL name:** `snake_case` plural — always explicit: `pgTable("project_members", ...)`
- **Column SQL name:** `snake_case`, explicit in the column definition
- **Foreign keys:** `<other>Id` in TS, `<other>_id` in SQL — declare with `.references(() => other.id)`
- **Relations:** define with Drizzle's `relations()` helper in the same file as the table
- **One table per concept.** Group tightly-coupled tables (e.g. `members` + `memberRoles`) in the same file.

## Manual migration (hotfix outside a deploy)

If you need to run a migration without deploying new code (rare):

```bash
kubectl -n project-f-staging port-forward svc/postgres-rw 5432:5432 &
DATABASE_URL="postgres://project_f:${STAGING_PASS}@localhost:5432/project_f?sslmode=require" \
  bun run db:migrate
```

To view the last automated migration Job's logs:

```bash
kubectl -n project-f-staging logs job/db-migrate
```
