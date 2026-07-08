# Contributing

Everything you need to start coding. Detailed dives are linked out.

## Setup

Requirements: Bun 1.3+, Node 22, Git.

```bash
bun install              # installs deps + sets up Husky hooks
cp .env.example .env.local
# fill in DATABASE_URL and (optionally) NEXT_PUBLIC_SENTRY_DSN
bun run dev
```

Env vars: **`src/env.ts` is the source of truth** — each var is documented there (scope, defaults, when it's needed, where it comes from). `.env.example` is a template that mirrors it.

## Daily commands

```bash
bun run dev              # next dev (turbopack)
bun run test             # vitest in watch mode
bun run check            # lint + format check + typecheck + tests (CI gate)
bun run fix              # eslint --fix + prettier --write
```

Run `bun run check` before opening a PR. CI runs the same.

## Database

Drizzle + Postgres. Quick reference:

```bash
bun run db:generate      # create migration from schema diff
bun run db:migrate       # apply pending migrations
bun run db:studio        # browse local DB
bun run db:smoke         # verify DB connectivity
```

Full workflow (adding tables, migration policy, conventions, manual overrides): [docs/database.md](docs/database.md).

## Branch workflow

Trunk-based. No `dev` branch. Feature branches → PR → squash-merge into `main`.

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

Breaking changes: `!` after the type/scope, e.g. `refactor(api)!: rename /users → /accounts`.

PR titles must follow the same format — enforced by `.github/workflows/pr-title.yml` because squash-merging uses the PR title as the commit on `main`.

## Hooks

| Hook         | Runs                                                           | Why                                       |
| ------------ | -------------------------------------------------------------- | ----------------------------------------- |
| `pre-commit` | `lint-staged` (eslint --fix, prettier --write on staged files) | Fast quality on what you touched          |
| `commit-msg` | `commitlint` on the message                                    | Enforce Conventional Commits              |
| `pre-push`   | `tsc --noEmit` (whole project)                                 | Type errors caught before push, not in CI |

Bypass with `--no-verify` only when truly necessary. CI re-runs everything and is unbypassable.

## Pull requests

Every PR includes:

- What changed and why (the PR template prompts for this)
- Screenshots/recording for UI changes
- Testing notes
- Linked task if available

Keep PRs small. One concern per PR.

**Reviews:**

- 1 approval required
- **Critical areas require Harsh review** (via CODEOWNERS): auth, RBAC, DB schema + migrations, billing, env, deploy config, queue workers, file access

## Folder conventions

Folders are created as they gain real content — no empty scaffolding.

```
src/
  app/                 Next.js App Router (pages, layouts, route handlers)
  db/                  Drizzle client + schema + migrations — see docs/database.md
  env.ts               Validated, typed env vars — import { env } from "@/env"
  features/<feature>/  Colocated feature module — see below
scripts/               CLI scripts — run with `bun scripts/<name>.ts`
```

Feature module shape (once a feature has real content):

```
src/features/<feature>/
  components/              Feature-scoped UI
  <feature>-actions.ts     Server actions (mutations)
  <feature>-queries.ts     Server reads
  <feature>-service.ts     Business logic
  <feature>-schema.ts      Zod schemas
```

Shared primitives → `src/components/ui/`, `src/lib/`, `src/server/`. Created when they have real content.

**Naming:**

- Folders: `kebab-case`
- React components: `PascalCase.tsx`
- Hooks: `use-something.ts`
- Everything else: `kebab-case.ts`

**Imports:**

- External packages → blank line → `@/...` internal → blank line → `./relative` → types
- Enforced by `import/order` (ESLint auto-fix)
- Avoid `../../..` — use `@/` aliases

**Enforced by lint (don't):**

- No `any` (use `unknown` and narrow)
- No unused imports/vars (prefix with `_` to intentionally ignore)
- No floating promises (`await`, `.catch`, or `void`)
- No unsafe access on `any` values

## Further reading

- [docs/database.md](docs/database.md) — Drizzle workflow, migration policy, adding tables
- [docs/secrets.md](docs/secrets.md) — inventory of every secret, rotation runbook
- [docs/observability.md](docs/observability.md) — Sentry setup + gotchas
- [deploy/README.md](deploy/README.md) — k3s + ArgoCD deployment runbook
