# Contributing

## Setup

Requirements: Bun 1.3+, Node 22, Git.

```bash
bun install              # installs deps + sets up Husky hooks
cp .env.example .env.local
bun run dev
```

## Daily commands

```bash
bun run dev              # next dev (turbopack)
bun run test             # vitest in watch mode
bun run check            # lint + format check + typecheck + tests (CI gate)
bun run fix              # eslint --fix + prettier --write
```

Run `bun run check` before opening a PR. CI runs the same.

### Database (Drizzle + Postgres)

```bash
bun run db:generate      # create migration SQL from schema diff (commit the result)
bun run db:migrate       # apply pending migrations to DATABASE_URL
bun run db:push          # dev-only: push schema without a migration (DO NOT use on shared/prod DB)
bun run db:studio        # browse the DB in a local web UI
bun run db:smoke         # insert + read a row to verify connectivity
```

**Migration policy:**

- Every schema change → `db:generate` → review the SQL → commit migration file with the schema change in the same PR
- Never edit a migration file after it has been applied to a shared DB — write a new forward migration instead
- `db:push` is for solo prototyping only; on shared/prod DBs always use generated migrations
- `db:migrate` runs automatically on every deploy as an ArgoCD PreSync Job — a failed migration blocks the deploy and leaves the running app untouched

**Where DB code lives:**

```
src/db/
  index.ts             Drizzle client (`db`) — single source of the connection pool
  schema/
    index.ts             Barrel file — re-exports every table so consumers can `import { users, projects } from "@/db/schema"`
    <domain>.ts          One file per logical domain (users.ts, organizations.ts, projects.ts, billing.ts)
  migrations/          Generated SQL + journal — committed, never hand-edited
```

> Important distinction: **Drizzle schema** (DB tables) lives in `src/db/schema/*.ts`. **Zod schema** (input validation for forms, server actions, API) lives in `src/features/<feature>/<feature>-schema.ts`. Same word, different jobs — keep them in their respective places.

**Adding a new table (the workflow):**

```bash
# 1. Create the table file
#    src/db/schema/projects.ts
```

```ts
// src/db/schema/projects.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

```ts
// 2. Re-export from the barrel so consumers can import from "@/db/schema"
//    src/db/schema/index.ts
export * from "./app-health-checks";
export * from "./projects";
```

```bash
# 3. Generate the migration SQL (drizzle-kit diffs schema vs DB)
bun run db:generate

# 4. Review src/db/migrations/<new>.sql — make sure the SQL matches your intent

# 5. Apply it locally, then commit the migration file in the same PR as the schema change
bun run db:migrate
# On the cluster, migrations run automatically before each deploy via an ArgoCD PreSync Job
# (scripts/migrate.ts bundled into the app image). No manual step needed on deploy.
```

```ts
// 6. Use it from server code
import { db } from "@/db";
import { projects } from "@/db/schema";

const rows = await db.select().from(projects);
```

**Conventions for table files:**

- Table variable name: `camelCase` plural — `users`, `projectMembers`
- Table SQL name: `snake_case` plural — `users`, `project_members` (write it explicitly in `pgTable("project_members", ...)`)
- Column SQL name: `snake_case` (explicit in the column definition)
- Foreign keys: `<other>Id` in TS, `<other>_id` in SQL — declare with `.references(() => other.id)`
- Relations: define with Drizzle's `relations()` helper in the same file as the table
- One table per concept; group tightly-coupled tables (e.g. `members` + `memberRoles`) in the same file

## Branch workflow

Trunk-based. No `dev` branch. Feature branches → PR → squash-merge into `main`.

Branch names:

```
feat/<short-description>
fix/<short-description>
refactor/<short-description>
docs/<short-description>
chore/<short-description>
```

## Commit format

[Conventional Commits](https://www.conventionalcommits.org) — enforced by commitlint:

```
<type>(<optional scope>): <subject>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Mark breaking changes with `!` after the type/scope, e.g. `refactor(api)!: rename /users → /accounts`.

PR titles must follow the same format — enforced by `.github/workflows/pr-title.yml` because squash-merging uses the PR title as the commit on `main`.

## Pre-commit / pre-push hooks

| Hook         | Runs                                                           | Why                                       |
| ------------ | -------------------------------------------------------------- | ----------------------------------------- |
| `pre-commit` | `lint-staged` (eslint --fix, prettier --write on staged files) | Fast quality on what you touched          |
| `commit-msg` | `commitlint` on the message                                    | Conventional Commits                      |
| `pre-push`   | `tsc --noEmit` (whole project)                                 | Type errors caught before push, not in CI |

Bypass with `--no-verify` only when truly necessary. CI re-runs everything and is unbypassable.

## Pull request rules

Every PR includes:

- Summary of what changed and why
- Screenshots/recording for UI changes
- Testing notes (what you exercised locally)
- Linked task if available

Keep PRs small. One concern per PR. A PR that "adds auth, dashboard, projects, layout, db, and styling" gets sent back.

### Reviews

- Default: 1 approval required
- **Critical areas require Harsh review:** auth, RBAC/permissions, DB schema + migrations, billing, environment variables, deployment config, queue workers, file access

## Architecture (current state)

> This section reflects what exists today. When the architecture grows (DB, auth, services), expand a dedicated `docs/ARCHITECTURE.md`.

**Stack:**

- Next.js 16 App Router + React 19 (with React Compiler enabled)
- TypeScript strict mode (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- Tailwind CSS v4 (CSS-first via `@theme`)
- Bun as package manager + runtime for scripts
- Vitest + Testing Library + happy-dom
- Sentry for error tracking (instrumentation pattern)
- T3-env (zod) for env validation at boot

**Folder conventions** (folders created as needed — no empty scaffolding):

```
src/
  app/                 Next.js App Router (pages, layouts, route handlers)
  db/
    index.ts             Drizzle client — import { db } from "@/db"
    schema/              Table definitions (one file per logical group)
    migrations/          Generated SQL — committed, never hand-edited
  env.ts               Validated, typed env vars — import { env } from "@/env"
scripts/
  db-smoke.ts          CLI scripts — run with `bun scripts/<name>.ts`
```

When we add features, follow this colocation pattern (Phase 1B):

```
src/features/<feature>/
  components/          Feature-scoped UI
  <feature>-actions.ts     Server actions (mutations)
  <feature>-queries.ts     Server reads
  <feature>-service.ts     Business logic
  <feature>-schema.ts      Zod schemas
```

Shared primitives go in `src/components/ui/`, `src/lib/`, `src/server/`, `src/db/` — created when they have real content.

**Naming:**

- Folders: `kebab-case`
- React components: `PascalCase.tsx`
- Hooks: `use-something.ts`
- Everything else: `kebab-case.ts`

**Imports:**

- External packages → blank line → `@/...` internal → blank line → `./relative` → types
- Enforced by `import/order` (ESLint auto-fix)
- Avoid `../../..` — use `@/` aliases

**Don'ts (enforced by lint):**

- No `any` (use `unknown` and narrow)
- No unused imports/vars (prefix with `_` to intentionally ignore)
- No floating promises (await, `.catch`, or `void` it)
- No unsafe access on `any` values

## GitHub branch protection (manual setup)

After the first push to GitHub:

1. **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals → **1**
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners (once `CODEOWNERS` exists)
   - ✅ Require status checks to pass before merging
     - Required checks (added after first CI run): `CI / Lint + Format + Typecheck + Tests + Build`, `PR Title / Validate Conventional Commit format`
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Block force pushes
   - ✅ Block deletions
4. **Settings → General → Pull Requests:** disable "Merge commits" and "Rebase". Allow **only "Squash and merge"**, with PR title as the default commit message.
5. **Settings → Code security → Dependabot alerts:** enable (Renovate handles updates, but alerts surface CVEs faster).

## Renovate setup

`renovate.json` is committed. To activate:

1. Install the [Renovate GitHub App](https://github.com/apps/renovate) on the repo
2. Renovate will open a "Configure Renovate" onboarding PR — merge it
3. From then on, dependency updates arrive as grouped PRs on Mondays

## Sentry setup

The instrumentation is already wired: `instrumentation.ts` (server/edge), `instrumentation-client.ts` (browser), and `withSentryConfig` in `next.config.ts`.

**Do not run `@sentry/wizard`** — it would overwrite these files. Everything the wizard creates is already in place.

To activate for local dev, add to `.env.local`:

```
NEXT_PUBLIC_SENTRY_DSN=https://...ingest.de.sentry.io/...
```

For CI/deployed builds, the DSN lives in **GitHub Actions Variables** (not secrets), because `NEXT_PUBLIC_*` values are baked into the client bundle at `docker build` time — you cannot inject them at runtime. See `deploy/README.md` for the full env-var matrix.

Notes:

- **Client events go directly to `sentry.io`.** The `tunnelRoute` option is intentionally omitted because `@sentry/nextjs` v10 + Turbopack does not auto-generate the route (client beacons would 404). Browser ad blockers may drop events as a result — an acceptable tradeoff for now.
- **Never use `env.NODE_ENV` in client-side code.** `NODE_ENV` is declared in the `server` section of `src/env.ts`; accessing it via `env.*` on the client throws at runtime. Use `process.env.NODE_ENV` directly — Next.js makes it available everywhere.
