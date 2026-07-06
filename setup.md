Yes. Before setup, you should define an **Alynx engineering standard** for this project.

The goal is not just “install Prettier and ESLint.” The goal is:

> Every developer writes code in the same style, commits in the same format, opens PRs the same way, and cannot merge broken code.

For Freelancer Kit, I would create these docs before coding:

```txt
CONTRIBUTING.md
CODE_STYLE.md
GIT_WORKFLOW.md
PR_TEMPLATE.md
ARCHITECTURE.md
```

You can start with one combined `CONTRIBUTING.md`, then split later.

---

# The standard I recommend

## 1. TypeScript style

Use **strict TypeScript**.

Rules:

```txt
No implicit any
No random any
No unused variables
No unused imports
Prefer explicit return types for exported functions
Prefer type over interface unless extension/merging is needed
Use named exports by default
Avoid default exports except Next.js pages/layouts/components where required
```

This keeps the code easier to refactor as the product grows.

Use:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

I would not allow juniors to use `any` unless a senior approves it.

---

## 2. Formatting: Prettier owns formatting

Use **Prettier** for formatting decisions.

Do not let the team debate tabs, semicolons, quote style, trailing commas, etc. Prettier exists to remove that discussion. Prettier recommends using a config file so the CLI, editor integrations, and other tools all know which options the project uses. ([prettier.io][1])

Recommended `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

This is not the only valid style. The important thing is that **there is one style and it is enforced automatically**.

Also add `.prettierignore`:

```txt
.next
node_modules
dist
build
coverage
drizzle
pnpm-lock.yaml
```

---

## 3. Linting: ESLint owns code quality rules

Use **ESLint + typescript-eslint + Next.js rules**.

typescript-eslint currently recommends ESLint’s newer flat config format for TypeScript projects. ([typescript-eslint.io][2]) Next.js also has official ESLint integration and documents using the Next plugin directly in flat config setups. ([Next.js][3])

Your linting should catch:

```txt
unused variables
unused imports
unsafe any usage
wrong import order
React/Next.js mistakes
bad async patterns
wrong hook usage
unhandled promises where possible
```

Recommended approach:

```txt
Prettier = formatting
ESLint = correctness/style safety
TypeScript = type safety
CI = enforcement
```

Do **not** make ESLint fight Prettier. Use Prettier for formatting and ESLint for quality.

---

## 4. File naming convention

Pick one convention and enforce it.

Recommended:

```txt
Folders: kebab-case
React components: PascalCase.tsx
Hooks: use-something.ts
Utilities: kebab-case.ts
Server actions: something-actions.ts
Server queries: something-queries.ts
Services: something-service.ts
Types/schemas: something-schema.ts
```

Example:

```txt
src/features/projects/components/ProjectCard.tsx
src/features/projects/project-actions.ts
src/features/projects/project-queries.ts
src/features/projects/project-service.ts
src/features/projects/project-schema.ts
```

Avoid random names like:

```txt
helper.ts
utils.ts
data.ts
newFile.tsx
projectStuff.ts
```

Those become impossible to scale.

---

## 5. Import rules

Use path aliases and consistent imports.

Recommended aliases:

```txt
@/components
@/features
@/lib
@/server
@/db
@/types
```

Import order should be:

```txt
1. External packages
2. Internal aliases
3. Relative imports
4. Types
5. Styles
```

Example:

```ts
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { createProject } from "@/features/projects/project-actions";

import { ProjectStatusBadge } from "./ProjectStatusBadge";

import type { Project } from "@/features/projects/project-types";
```

Avoid deep messy imports like:

```ts
import { Button } from "../../../../components/ui/button";
```

---

## 6. Git hooks: Husky + lint-staged

Use **Husky** for Git hooks and **lint-staged** so only changed files are formatted/linted before commit.

Husky’s current docs recommend `husky init`, which creates a `.husky/pre-commit` file and updates the `prepare` script in `package.json`. ([typicode.github.io][4]) lint-staged is specifically designed to run linters/formatters against staged Git files before they enter the codebase. ([GitHub][5])

Recommended pre-commit:

```txt
lint-staged
```

Recommended `lint-staged.config.js`:

```js
const config = {
  "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css,scss}": ["prettier --write"],
};

export default config;
```

Important: pre-commit hooks should be **fast**. Do not run full build on every commit. Run full build in CI.

---

## 7. Commit messages: Conventional Commits + commitlint

Use **Conventional Commits**.

The Conventional Commits spec defines a lightweight commit format that makes history machine-readable and easier to automate. ([conventionalcommits.org][6]) commitlint supports enforcing commit messages through a `commit-msg` hook, commonly with Husky. ([commitlint.js.org][7])

Format:

```txt
type(scope): description
```

Examples:

```txt
feat(auth): add sign in page
fix(projects): prevent empty project names
refactor(db): move organization schema
docs(contributing): add git workflow
chore(deps): update eslint config
```

Allowed types:

```txt
feat
fix
docs
style
refactor
perf
test
chore
ci
build
revert
```

Rules:

```txt
Use lowercase type
Use present tense
Keep first line under 100 chars
Do not write vague commits like "update", "fix", "changes"
```

Bad:

```txt
fixed stuff
changes
work
final
new code
```

Good:

```txt
fix(auth): redirect signed-in users away from login
```

---

## 8. Branch naming

Use consistent branch names.

Recommended:

```txt
feature/auth-sign-in
feature/project-dashboard
fix/project-status-validation
refactor/db-schema-organization
docs/contributing-guide
chore/setup-eslint
```

Format:

```txt
type/short-description
```

Allowed prefixes:

```txt
feature/
fix/
refactor/
docs/
chore/
hotfix/
```

---

## 9. PR rules

Every PR must include:

```txt
Summary
What changed
Screenshots for UI
How it was tested
Known limitations
Linked task
```

PRs should be small.

Good PR:

```txt
Add project status badge component
```

Bad PR:

```txt
Add auth, dashboard, projects, layout, database changes, and styling
```

For the team:

```txt
Junior PRs -> reviewed by Zaid first
Zaid PRs -> reviewed by you for architecture/security/db/auth
Critical PRs -> must be reviewed by you
```

Critical areas:

```txt
auth
database schema
Drizzle migrations
permissions
organization membership
billing later
file access later
queue workers later
deployment config
```

---

## 10. GitHub branch protection

Protect `main`.

GitHub branch protection rules can require approving reviews and passing status checks before PRs can merge. ([GitHub Docs][8]) GitHub also documents that required status checks must pass before merging into a protected branch. ([GitHub Docs][9])

Recommended `main` rules:

```txt
No direct pushes
Require pull request
Require 1 approval minimum
Require conversation resolution
Require status checks
Require branch up to date before merge
Block force pushes
Block deletions
```

Required CI checks:

```txt
lint
typecheck
format:check
build
```

Later add:

```txt
test
e2e
security scan
```

---

# Recommended setup stack for standards

Install:

```txt
prettier
eslint
typescript-eslint
@next/eslint-plugin-next
eslint-config-prettier
husky
lint-staged
@commitlint/cli
@commitlint/config-conventional
```

Optional but useful:

```txt
eslint-plugin-unused-imports
eslint-plugin-import-x
eslint-plugin-promise
```

I would keep the first setup strict but not insane. Too many rules early will slow juniors down.

---

# Suggested package scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm build"
  }
}
```

Local dev uses:

```txt
pnpm dev
```

Before opening PR:

```txt
pnpm check
```

CI runs:

```txt
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

---

# My recommended coding style for Alynx

Use this as your official style:

## General

```txt
TypeScript strict mode
Functional React components only
Named exports by default
No default exports except Next.js route/page/layout conventions
No any unless approved
No console.log in committed code except temporary debugging removed before PR
No dead code
No commented-out code
No large files without reason
```

## Components

```txt
One component per file unless tiny private subcomponents
Component names use PascalCase
Props type is named ComponentNameProps
Keep components focused
Server components by default
Client components only when needed
```

Example:

```ts
type ProjectCardProps = {
  projectId: string;
  name: string;
  status: "draft" | "active" | "completed";
};

export function ProjectCard({ projectId, name, status }: ProjectCardProps) {
  return <article>{name}</article>;
}
```

## Server code

```txt
Database access stays server-side
Business logic goes in services
Reads go in queries
Mutations go in actions
Validation happens server-side
Never trust frontend validation only
```

Recommended structure:

```txt
src/features/projects/
  components/
  project-actions.ts
  project-queries.ts
  project-service.ts
  project-schema.ts
  project-types.ts
```

## Error handling

```txt
Do not silently swallow errors
Return user-safe error messages
Log internal errors server-side
Never expose secrets/database internals to client
```

## Forms

```txt
Use TanStack Form
Use shared validation schemas
Validate on client for UX
Validate on server for security
```

## State

```txt
Server data: server components / server actions / TanStack Query
Form state: TanStack Form
UI state: React state or Zustand
Do not store database records in Zustand as source of truth
```

---

# Suggested enforcement levels

Start with this:

| Rule                | Enforced by              |
| ------------------- | ------------------------ |
| Formatting          | Prettier                 |
| Code quality        | ESLint                   |
| Type safety         | TypeScript               |
| Commit style        | commitlint               |
| Pre-commit cleanup  | Husky + lint-staged      |
| PR quality          | PR template              |
| Merge safety        | GitHub branch protection |
| Build safety        | GitHub Actions           |
| Architecture safety | Code review              |

This gives you a real engineering process without making the team hate the tooling.

---

# What your `CONTRIBUTING.md` should contain

Structure it like this:

```txt
1. Project principles
2. Local setup
3. Branch workflow
4. Commit message rules
5. Pull request rules
6. Coding style
7. File/folder conventions
8. TypeScript rules
9. React/Next.js rules
10. State management rules
11. Database rules
12. Testing/checking commands
13. Review process
14. What juniors must not touch without approval
```

The most important section for your team is probably:

```txt
What juniors must not touch without approval
```

That should include:

```txt
auth
permissions
database migrations
organization membership logic
billing
file access
queue workers
deployment config
environment variables
```

---

# My final recommendation

Before creating the project, decide these now:

```txt
1. Prettier config
2. ESLint config
3. TypeScript strict config
4. Conventional Commit rules
5. Branch naming rules
6. PR template
7. Protected branch rules
8. Folder structure
9. What code juniors are allowed to touch
10. Definition of done
```

Do not over-research endlessly. The standard does not need to be perfect. It needs to be **clear, enforced, and followed from day one**.

For Alynx/Freelancer Kit, the core rule should be:

> Every developer can write code, but nobody can merge code that fails format, lint, typecheck, build, review, or architecture rules.

[1]: https://prettier.io/docs/options?utm_source=chatgpt.com "Options · Prettier"
[2]: https://typescript-eslint.io/getting-started/?utm_source=chatgpt.com "Getting Started - typescript-eslint"
[3]: https://nextjs.org/docs/pages/api-reference/config/eslint?utm_source=chatgpt.com "Configuration: ESLint | Next.js"
[4]: https://typicode.github.io/husky/get-started.html?utm_source=chatgpt.com "Get started | Husky - GitHub Pages"
[5]: https://github.com/lint-staged/lint-staged?utm_source=chatgpt.com "GitHub - lint-staged/lint-staged: — Run tasks like formatters and ..."
[6]: https://www.conventionalcommits.org/en/v1.0.0/?utm_source=chatgpt.com "Conventional Commits"
[7]: https://commitlint.js.org/guides/local-setup.html?utm_source=chatgpt.com "Guide: Local setup | commitlint"
[8]: https://docs.github.com/articles/enabling-required-status-checks?utm_source=chatgpt.com "Managing a branch protection rule - GitHub Docs"
[9]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks?utm_source=chatgpt.com "About status checks - GitHub Docs"
Yes, you need a few more things for Phase 1 technical foundation, but keep it controlled.

For **Phase 1 Hello World**, the goal is:

> Create a clean Next.js repo, enforce code standards, add local infra files, add docs, commit everything, push to GitHub, and make sure another developer can clone it and run it.

Do **not** set up the full auth/database/module system yet. That comes after this foundation commit.

---

# Phase 1A: Hello World Foundation Checklist

## 0. Final decisions before setup

Use these decisions for the first commit:

| Area            | Decision                                                 |
| --------------- | -------------------------------------------------------- |
| App             | Next.js App Router                                       |
| Language        | TypeScript                                               |
| Package manager | pnpm                                                     |
| Styling         | Tailwind                                                 |
| UI              | shadcn/ui later in Phase 1B                              |
| Backend         | Next.js full-stack                                       |
| Database        | Postgres via Docker, configured but not wired deeply yet |
| ORM             | Drizzle, can install after Hello World or in same phase  |
| Auth            | Better Auth, not in Hello World                          |
| Formatting      | Prettier                                                 |
| Linting         | ESLint                                                   |
| Git hooks       | Husky + lint-staged                                      |
| Commits         | Conventional Commits + commitlint                        |
| CI              | GitHub Actions                                           |
| Repo visibility | Private GitHub repo                                      |

Next.js officially supports bootstrapping with `create-next-app`, including TypeScript, ESLint, Tailwind, App Router, and import aliases. ([Next.js][1])

---

# 1. Create the local project

Run:

```bash
pnpm create next-app@latest freelancer-kit
```

Choose:

```txt
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src/ directory: Yes
App Router: Yes
Turbopack: Yes
Import alias: @/*
```

Then:

```bash
cd freelancer-kit
pnpm dev
```

Open the local app and confirm the default Next.js page works.

---

# 2. Replace the default page with your Hello World page

Edit:

```txt
src/app/page.tsx
```

Use a simple page like:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Freelancer Kit</h1>
        <p className="mt-4 text-muted-foreground">
          Alynx internal SaaS platform foundation.
        </p>
      </section>
    </main>
  );
}
```

At this stage, it only needs to prove the app runs.

---

# 3. Set Node and package manager standards

Create:

```txt
.nvmrc
```

Use:

```txt
22
```

In `package.json`, add:

```json
{
  "packageManager": "pnpm@10.0.0"
}
```

You can adjust the exact pnpm version based on your installed version:

```bash
pnpm -v
```

This prevents team members from mixing npm/yarn/pnpm.

---

# 4. Add Prettier

Install:

```bash
pnpm add -D prettier
```

Create:

```txt
.prettierrc
```

Use:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Create:

```txt
.prettierignore
```

Use:

```txt
.next
node_modules
dist
build
coverage
pnpm-lock.yaml
```

Prettier recommends using a config file so CLI usage, editor integrations, and other tooling apply the same formatting rules across the project. ([Prettier][2])

---

# 5. Add basic scripts

In `package.json`, make sure you have scripts like:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm build"
  }
}
```

Run:

```bash
pnpm format
pnpm check
```

Fix anything that fails before the first commit.

---

# 6. Tighten TypeScript

Open:

```txt
tsconfig.json
```

Make sure strict mode is on. Add these if not present:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

Also confirm your alias exists:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Next.js documents setting up module path aliases so imports like `@/components/*` can be mapped cleanly. ([Next.js][3])

---

# 7. Add EditorConfig

Create:

```txt
.editorconfig
```

Use:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

This helps keep formatting consistent across editors.

---

# 8. Add Git hooks with Husky and lint-staged

Install:

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

Husky’s current setup flow uses `husky init`, which creates a pre-commit hook and updates the package `prepare` script. ([typicode.github.io][4]) lint-staged is designed to run linters/formatters against staged files before they enter the codebase. ([GitHub][5])

Create:

```txt
lint-staged.config.js
```

Use:

```js
const config = {
  "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css}": ["prettier --write"],
};

export default config;
```

Edit:

```txt
.husky/pre-commit
```

Use:

```sh
pnpm exec lint-staged
```

---

# 9. Add commitlint for commit message standards

Install:

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

Create:

```txt
commitlint.config.js
```

Use:

```js
export default {
  extends: ["@commitlint/config-conventional"],
};
```

Create:

```txt
.husky/commit-msg
```

Use:

```sh
pnpm exec commitlint --edit "$1"
```

Your commits should now follow:

```txt
type(scope): message
```

Example:

```txt
chore(setup): initialize next app foundation
```

---

# 10. Add Docker local infra files

Create:

```txt
docker-compose.yml
```

Use:

```yml
services:
  postgres:
    image: postgres:16
    container_name: freelancer-kit-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: freelancer
      POSTGRES_PASSWORD: freelancer
      POSTGRES_DB: freelancer_kit
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: freelancer-kit-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run:

```bash
docker compose up -d
docker compose ps
```

For Hello World, you do not need to connect the app to Postgres yet. Just add the infra file so the team standard is set.

---

# 11. Add environment example

Create:

```txt
.env.example
```

Use:

```txt
# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database
DATABASE_URL="postgres://freelancer:freelancer@localhost:5432/freelancer_kit"

# Auth - used later
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"

# Queue - used later
REDIS_URL="redis://localhost:6379"
```

Create local file:

```txt
.env.local
```

Do not commit it.

Make sure `.gitignore` includes:

```txt
.env
.env.*
!.env.example
```

---

# 12. Add GitHub Actions CI

Create folders:

```txt
.github/workflows
```

Create:

```txt
.github/workflows/ci.yml
```

Use:

```yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    name: quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Format check
        run: pnpm format:check

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build
```

GitHub branch protection can require pull request reviews and passing status checks before merging, which is exactly what you want once CI is active. ([GitHub Docs][6])

---

# 13. Add GitHub templates

Create:

```txt
.github/pull_request_template.md
```

Use:

```md
## Summary

What changed?

## Type of Change

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

## Screenshots / Recordings

Required for UI changes.

## Testing

- [ ] Ran `pnpm check`
- [ ] Tested locally
- [ ] Added/updated tests if needed

## Risk Areas

- [ ] Auth
- [ ] Database
- [ ] Permissions
- [ ] Environment variables
- [ ] Deployment
- [ ] None

## Notes

Anything reviewers should know?
```

Create:

```txt
.github/ISSUE_TEMPLATE/task.md
```

Use:

```md
---
name: Task
about: Engineering task
title: ""
labels: task
assignees: ""
---

## Goal

## Scope

## Acceptance Criteria

- [ ]

## Out of Scope

## Notes
```

---

# 14. Add required docs

Create:

```txt
docs/
```

Add these files:

```txt
docs/ARCHITECTURE.md
docs/CODE_STYLE.md
docs/GIT_WORKFLOW.md
docs/ROADMAP.md
docs/QUALITY.md
```

Also create root:

```txt
CONTRIBUTING.md
README.md
```

## `README.md`

Use:

````md
# Freelancer Kit

Freelancer Kit is Alynx's internal SaaS platform for managing the freelance/client lifecycle.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Postgres
- Redis
- Drizzle ORM
- Better Auth
- TanStack ecosystem
- shadcn/ui

## Getting Started

### Requirements

- Node.js 22
- pnpm
- Docker

### Setup

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm dev
````

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks

```bash
pnpm check
```

## Git Workflow

Use feature branches and pull requests. Do not push directly to `main`.

See `CONTRIBUTING.md`.

````

## `CONTRIBUTING.md`

Use:

```md
# Contributing

## Core Rules

- Do not push directly to `main`.
- Create a branch for every change.
- Open a pull request for review.
- Run `pnpm check` before requesting review.
- UI changes require screenshots.
- Auth, database, permissions, environment, and deployment changes require Harsh review.

## Branch Naming

Use:

- `feature/short-description`
- `fix/short-description`
- `refactor/short-description`
- `docs/short-description`
- `chore/short-description`

## Commit Format

Use Conventional Commits:

```txt
type(scope): message
````

Examples:

```txt
chore(setup): initialize project foundation
feat(auth): add sign in page
fix(layout): correct dashboard spacing
```

## Pull Requests

Each PR must include:

* Summary
* Screenshots for UI changes
* Testing notes
* Known risks
* Linked task if available

## Before Opening PR

Run:

```bash
pnpm check
```

````

## `docs/CODE_STYLE.md`

Use:

```md
# Code Style

## TypeScript

- Use strict TypeScript.
- Avoid `any`.
- Prefer named exports.
- Use explicit types for exported functions.
- Keep files focused.

## React

- Use Server Components by default.
- Use Client Components only when interactivity is required.
- Component files use PascalCase.
- Props types use `ComponentNameProps`.

## State

- Server data: Server Components, Server Actions, or TanStack Query.
- Form state: TanStack Form.
- UI state: React state or Zustand.
- Do not store database records in Zustand as source of truth.

## Naming

- Folders: kebab-case
- Components: PascalCase
- Hooks: use-something.ts
- Server actions: feature-actions.ts
- Queries: feature-queries.ts
- Services: feature-service.ts
````

## `docs/GIT_WORKFLOW.md`

Use:

```md
# Git Workflow

## Branches

- `main`: production-ready
- `feature/*`: new work
- `fix/*`: bug fixes
- `docs/*`: documentation
- `refactor/*`: refactors
- `chore/*`: maintenance

## Rules

- No direct pushes to `main`.
- PR required for every change.
- At least one approval required.
- CI must pass before merge.
- Resolve all conversations before merge.
```

## `docs/ARCHITECTURE.md`

Use:

````md
# Architecture

## Current Phase

Phase 1A: Hello World foundation.

## Backend

Next.js is the main backend for now.

Use:

- Server Components for reads
- Server Actions for internal mutations later
- Route Handlers for external/public endpoints later

## Database

Postgres via Docker locally.

Drizzle ORM will be added for schema and migrations.

## Queue

Redis is available locally.

BullMQ workers will be added later as a separate process when background jobs are needed.

## Folder Direction

```txt
src/
  app/
  components/
  features/
  db/
  server/
  lib/
  stores/
  types/
````

````

## `docs/QUALITY.md`

Use:

```md
# Quality

## Required Checks

Before review:

```bash
pnpm check
````

This runs:

* format check
* lint
* typecheck
* build

## Definition of Done

A task is done only when:

* Acceptance criteria are met
* Code is formatted
* Lint passes
* Typecheck passes
* Build passes
* UI changes include screenshots
* PR is reviewed

````

## `docs/ROADMAP.md`

Use:

```md
# Roadmap

## Phase 1A: Hello World Foundation

- Next.js app
- TypeScript
- Tailwind
- Prettier
- ESLint
- Husky
- lint-staged
- commitlint
- GitHub Actions
- Docker Postgres/Redis
- Required docs
- GitHub repo

## Phase 1B: App Foundation

- shadcn/ui
- Drizzle
- Better Auth
- Organization model
- Protected dashboard
- App shell

## Phase 2: First Product Module

- Clients
- Projects
- Project workspace
- Milestones
- Internal notes
````

---

# 15. Create the GitHub repo

In GitHub:

1. Create new private repo
2. Name it:

```txt
freelancer-kit
```

3. Do not initialize with README because you already have one locally.

Then locally:

```bash
git init
git add .
git commit -m "chore(setup): initialize project foundation"
git branch -M main
git remote add origin git@github.com:YOUR_ORG_OR_USER/freelancer-kit.git
git push -u origin main
```

If commitlint blocks the commit, fix the message format.

---

# 16. Turn on branch protection

After the first push, go to GitHub:

```txt
Repo → Settings → Branches → Add branch protection rule
```

Branch name pattern:

```txt
main
```

Enable:

```txt
Require a pull request before merging
Require approvals: 1
Dismiss stale approvals when new commits are pushed
Require review from Code Owners later if you add CODEOWNERS
Require status checks to pass
Require branches to be up to date before merging
Require conversation resolution
Block force pushes
Block deletions
```

Once the CI workflow has run at least once, select the required status check:

```txt
quality
```

---

# 17. Add CODEOWNERS

Create:

```txt
.github/CODEOWNERS
```

Use:

```txt
# Global owner
* @YOUR_GITHUB_USERNAME

# Critical areas
/src/db/ @YOUR_GITHUB_USERNAME
/src/server/ @YOUR_GITHUB_USERNAME
/src/lib/auth/ @YOUR_GITHUB_USERNAME
/.github/ @YOUR_GITHUB_USERNAME
/docker-compose.yml @YOUR_GITHUB_USERNAME
```

Later add Zaid where appropriate.

---

# 18. Final local validation

Run this full check:

```bash
pnpm install
pnpm format
pnpm check
docker compose up -d
pnpm dev
```

Confirm:

```txt
Local app opens
Hello World page displays
Docker services run
Git hooks work
Commitlint works
CI works on GitHub
Docs exist
README setup works
```

---

# Phase 1A Definition of Done

You are done with Hello World setup when:

```txt
Next.js app runs locally
Hello World page works
TypeScript strict is enabled
Prettier is configured
ESLint runs
Husky pre-commit runs lint-staged
commitlint enforces commit messages
Docker Compose includes Postgres and Redis
.env.example exists
README exists
CONTRIBUTING.md exists
Architecture/code style/git/quality/roadmap docs exist
GitHub Actions CI exists
Repo is pushed to GitHub
main branch is protected
A fresh clone can run the app from README instructions
```

---

# What can wait until Phase 1B

Do **not** do these before the Hello World repo is stable:

```txt
Better Auth
Drizzle schema
shadcn/ui full setup
TanStack Query/Form/Table
Zustand
BullMQ worker
Dashboard layout
Organization model
Database migrations
Deployment to Vercel
```

Those are next.

For now, your job is to create a clean, enforceable foundation that Zaid and the juniors can safely build on.

[1]: https://nextjs.org/docs/app/api-reference/cli/create-next-app?utm_source=chatgpt.com "CLI: create-next-app | Next.js"
[2]: https://prettier.io/docs/configuration?utm_source=chatgpt.com "Configuration File - Prettier"
[3]: https://nextjs.org/docs/app/getting-started/installation?utm_source=chatgpt.com "Getting Started: Installation | Next.js"
[4]: https://typicode.github.io/husky/get-started.html?utm_source=chatgpt.com "Get started | Husky - GitHub Pages"
[5]: https://github.com/lint-staged/lint-staged?utm_source=chatgpt.com "GitHub - lint-staged/lint-staged: — Run tasks like formatters and ..."
[6]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule?utm_source=chatgpt.com "Managing a branch protection rule - GitHub Docs"

Yes — with **Bun instead of pnpm**, here is the exact project setup checklist from zero to a working **Hello World foundation on GitHub**.

We will use Bun as the package manager/runtime for local scripts and CI. Bun’s docs show it can run Next.js development and production workflows, and Bun also provides a Node-compatible package manager for projects with `package.json`. ([Bun][1])

---

# Phase 1A Goal

By the end of this setup, you should have:

```txt
Freelancer Kit repo
Next.js Hello World page
Bun package manager
TypeScript strict mode
Tailwind
Prettier
ESLint
Husky
lint-staged
commitlint
Docker Postgres + Redis
.env.example
GitHub Actions CI using Bun
GitHub PR template
Docs
Protected main branch
```

This is still **not auth, database models, clients, projects, or dashboard**.
This is the clean project foundation.

---

# Step 0 — Install requirements

Make sure you have:

```txt
Bun
Git
Docker Desktop
VS Code or preferred editor
GitHub account / Alynx GitHub org
```

Check:

```bash
bun --version
git --version
docker --version
```

---

# Step 1 — Create the Next.js project with Bun

Run:

```bash
bunx create-next-app@latest freelancer-kit
```

Choose:

```txt
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src/ directory: Yes
App Router: Yes
Turbopack: Yes
Import alias: @/*
```

Next.js officially documents `create-next-app` as the easiest way to start a new Next.js app, including TypeScript, ESLint, Tailwind, App Router, and import aliases. ([Next.js][2])

Then:

```bash
cd freelancer-kit
bun install
bun dev
```

Open:

```txt
http://localhost:3000
```

---

# Step 2 — Set Bun as the package manager

In `package.json`, add or confirm:

```json
{
  "packageManager": "bun@latest"
}
```

Better option: use your exact installed Bun version.

Check:

```bash
bun --version
```

Example:

```json
{
  "packageManager": "bun@1.2.21"
}
```

Commit `bun.lock`. Do **not** commit `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`.

---

# Step 3 — Replace the default page with Hello World

Edit:

```txt
src/app/page.tsx
```

Use:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Freelancer Kit</h1>
        <p className="mt-4 text-sm text-gray-600">Alynx internal SaaS platform foundation.</p>
      </section>
    </main>
  );
}
```

Run:

```bash
bun dev
```

Confirm the page renders.

---

# Step 4 — Clean default files

Remove unnecessary starter content if present:

```txt
public/next.svg
public/vercel.svg
```

Keep:

```txt
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
```

Do not over-clean. Keep the app working.

---

# Step 5 — Tighten TypeScript

Open:

```txt
tsconfig.json
```

Make sure strict mode is enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

Confirm alias exists:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

# Step 6 — Add recommended folder structure

Create:

```txt
src/components
src/components/ui
src/components/layout
src/components/shared

src/features
src/server
src/server/actions
src/server/queries
src/server/services

src/db
src/lib
src/lib/env
src/lib/utils
src/types
src/stores

docs
```

For now these can be empty, but Git does not track empty folders. Add `.gitkeep` files if you want the structure committed:

```bash
touch src/components/ui/.gitkeep
touch src/components/layout/.gitkeep
touch src/components/shared/.gitkeep
touch src/features/.gitkeep
touch src/server/actions/.gitkeep
touch src/server/queries/.gitkeep
touch src/server/services/.gitkeep
touch src/db/.gitkeep
touch src/lib/env/.gitkeep
touch src/lib/utils/.gitkeep
touch src/types/.gitkeep
touch src/stores/.gitkeep
touch docs/.gitkeep
```

---

# Step 7 — Add Prettier

Install:

```bash
bun add -d prettier
```

Create:

```txt
.prettierrc
```

Use:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Create:

```txt
.prettierignore
```

Use:

```txt
.next
node_modules
dist
build
coverage
bun.lock
```

Prettier recommends project config files so formatting behavior is consistent across CLI/editor/tooling usage. ([Bun][3])

---

# Step 8 — Add EditorConfig

Create:

```txt
.editorconfig
```

Use:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

---

# Step 9 — Confirm ESLint setup

Your Next.js project should already include ESLint if you selected it during setup.

Open:

```txt
eslint.config.mjs
```

For now, keep the generated Next.js config. Do not overcomplicate ESLint on day one.

Your rule should be:

```txt
Prettier controls formatting.
ESLint controls correctness and project quality.
TypeScript controls type safety.
```

Later we can add stricter rules like import order, unused imports, promise rules, etc.

---

# Step 10 — Add package scripts for Bun

Open:

```txt
package.json
```

Use scripts like:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "bun run format:check && bun run lint && bun run typecheck && bun run build"
  }
}
```

Run:

```bash
bun run format
bun run check
```

Fix any issues before continuing.

---

# Step 11 — Add Docker Compose for Postgres and Redis

Create:

```txt
docker-compose.yml
```

Use:

```yml
services:
  postgres:
    image: postgres:16
    container_name: freelancer-kit-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: freelancer
      POSTGRES_PASSWORD: freelancer
      POSTGRES_DB: freelancer_kit
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: freelancer-kit-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run:

```bash
docker compose up -d
docker compose ps
```

For Hello World, we are only proving local infra is available. Drizzle and Better Auth come after this phase.

---

# Step 12 — Add environment files

Create:

```txt
.env.example
```

Use:

```txt
# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database
DATABASE_URL="postgres://freelancer:freelancer@localhost:5432/freelancer_kit"

# Auth - used later
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"

# Queue - used later
REDIS_URL="redis://localhost:6379"
```

Create your local env:

```bash
cp .env.example .env.local
```

Make sure `.gitignore` contains:

```txt
.env
.env.*
!.env.example
```

---

# Step 13 — Add Husky

Install:

```bash
bun add -d husky lint-staged
bunx husky init
```

Husky’s docs include Bun support through `bunx husky init`, which creates the `.husky/pre-commit` hook and updates the package scripts. ([Typicode][4])

Edit:

```txt
.husky/pre-commit
```

Use:

```sh
bunx lint-staged
```

---

# Step 14 — Add lint-staged config

Create:

```txt
lint-staged.config.js
```

Use:

```js
const config = {
  "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css}": ["prettier --write"],
};

export default config;
```

This keeps commits clean without running the full build every time.

---

# Step 15 — Add commitlint

Install:

```bash
bun add -d @commitlint/cli @commitlint/config-conventional
```

Create:

```txt
commitlint.config.js
```

Use:

```js
export default {
  extends: ["@commitlint/config-conventional"],
};
```

Create:

```txt
.husky/commit-msg
```

Use:

```sh
bunx commitlint --edit "$1"
```

Commit format:

```txt
type(scope): message
```

Examples:

```txt
chore(setup): initialize next app foundation
docs(contributing): add project workflow
fix(config): correct prettier ignore rules
```

---

# Step 16 — Add GitHub Actions CI using Bun

Create:

```txt
.github/workflows/ci.yml
```

Use:

```yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    name: quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Format check
        run: bun run format:check

      - name: Lint
        run: bun run lint

      - name: Typecheck
        run: bun run typecheck

      - name: Build
        run: bun run build
```

Bun’s official CI docs recommend using the `oven-sh/setup-bun` GitHub Action for GitHub Actions runners. ([Bun][5])

---

# Step 17 — Add PR template

Create:

```txt
.github/pull_request_template.md
```

Use:

```md
## Summary

What changed?

## Type of Change

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

## Screenshots / Recordings

Required for UI changes.

## Testing

- [ ] Ran `bun run check`
- [ ] Tested locally
- [ ] Added/updated tests if needed

## Risk Areas

- [ ] Auth
- [ ] Database
- [ ] Permissions
- [ ] Environment variables
- [ ] Deployment
- [ ] None

## Notes

Anything reviewers should know?
```

---

# Step 18 — Add issue template

Create:

```txt
.github/ISSUE_TEMPLATE/task.md
```

Use:

```md
---
name: Task
about: Engineering task
title: ""
labels: task
assignees: ""
---

## Goal

## Scope

## Acceptance Criteria

- [ ]

## Out of Scope

## Notes
```

---

# Step 19 — Add CODEOWNERS

Create:

```txt
.github/CODEOWNERS
```

Use:

```txt
# Global owner
* @YOUR_GITHUB_USERNAME

# Critical areas
/src/db/ @YOUR_GITHUB_USERNAME
/src/server/ @YOUR_GITHUB_USERNAME
/src/lib/auth/ @YOUR_GITHUB_USERNAME
/.github/ @YOUR_GITHUB_USERNAME
/docker-compose.yml @YOUR_GITHUB_USERNAME
```

Replace:

```txt
@YOUR_GITHUB_USERNAME
```

with your actual GitHub username.

---

# Step 20 — Add README

Create or replace:

```txt
README.md
```

Use:

````md
# Freelancer Kit

Freelancer Kit is Alynx's internal SaaS platform for managing the freelance/client lifecycle.

## Current Phase

Phase 1A: Hello World technical foundation.

## Tech Stack

- Next.js
- TypeScript
- Bun
- Tailwind CSS
- Postgres
- Redis
- Drizzle ORM later
- Better Auth later
- TanStack ecosystem later
- shadcn/ui later

## Requirements

- Bun
- Docker
- Git

## Setup

```bash
bun install
cp .env.example .env.local
docker compose up -d
bun dev
````

Open:

```txt
http://localhost:3000
```

## Quality Checks

```bash
bun run check
```

## Git Workflow

Use feature branches and pull requests.

Do not push directly to `main`.

See `CONTRIBUTING.md`.

````

---

# Step 21 — Add CONTRIBUTING.md

Create:

```txt
CONTRIBUTING.md
````

Use:

````md
# Contributing

## Core Rules

- Do not push directly to `main`.
- Create a branch for every change.
- Open a pull request for review.
- Run `bun run check` before requesting review.
- UI changes require screenshots.
- Auth, database, permissions, environment, and deployment changes require Harsh review.

## Branch Naming

Use:

- `feature/short-description`
- `fix/short-description`
- `refactor/short-description`
- `docs/short-description`
- `chore/short-description`

## Commit Format

Use Conventional Commits:

```txt
type(scope): message
````

Examples:

```txt
chore(setup): initialize project foundation
feat(auth): add sign in page
fix(layout): correct dashboard spacing
```

## Pull Requests

Each PR must include:

* Summary
* Screenshots for UI changes
* Testing notes
* Known risks
* Linked task if available

## Before Opening PR

Run:

```bash
bun run check
```

## Critical Areas

These require senior/owner review:

* Auth
* Permissions
* Database schema
* Migrations
* Environment variables
* Deployment configuration
* File access
* Billing
* Queue workers

````

---

# Step 22 — Add docs folder files

Create these:

```txt
docs/ARCHITECTURE.md
docs/CODE_STYLE.md
docs/GIT_WORKFLOW.md
docs/QUALITY.md
docs/ROADMAP.md
````

---

## `docs/ARCHITECTURE.md`

````md
# Architecture

## Current Phase

Phase 1A: Hello World foundation.

## Backend

Next.js is the main backend for now.

Use:

- Server Components for reads
- Server Actions for internal mutations later
- Route Handlers for public/external endpoints later

## Database

Postgres runs locally through Docker.

Drizzle ORM will be added in Phase 1B for schema and migrations.

## Queue

Redis runs locally through Docker.

BullMQ workers will be added later as a separate process when background jobs are needed.

## Folder Direction

```txt
src/
  app/
  components/
  features/
  db/
  server/
  lib/
  stores/
  types/
````

## Rule

Business logic should eventually live in `src/server/services` or feature service files, not directly inside UI components.

````

---

## `docs/CODE_STYLE.md`

```md
# Code Style

## TypeScript

- Use strict TypeScript.
- Avoid `any`.
- Prefer named exports.
- Use explicit types for exported functions.
- Keep files focused.

## React / Next.js

- Use Server Components by default.
- Use Client Components only when interactivity is required.
- Component files use PascalCase.
- Props types use `ComponentNameProps`.

## State

- Server data: Server Components, Server Actions, or TanStack Query.
- Form state: TanStack Form.
- UI state: React state or Zustand.
- Do not store database records in Zustand as the source of truth.

## Naming

- Folders: kebab-case
- Components: PascalCase
- Hooks: use-something.ts
- Server actions: feature-actions.ts
- Queries: feature-queries.ts
- Services: feature-service.ts
````

---

## `docs/GIT_WORKFLOW.md`

```md
# Git Workflow

## Branches

- `main`: production-ready
- `feature/*`: new work
- `fix/*`: bug fixes
- `docs/*`: documentation
- `refactor/*`: refactors
- `chore/*`: maintenance

## Rules

- No direct pushes to `main`.
- PR required for every change.
- At least one approval required.
- CI must pass before merge.
- Resolve all conversations before merge.
```

---

## `docs/QUALITY.md`

````md
# Quality

## Required Checks

Before review:

```bash
bun run check
````

This runs:

* format check
* lint
* typecheck
* build

## Definition of Done

A task is done only when:

* Acceptance criteria are met
* Code is formatted
* Lint passes
* Typecheck passes
* Build passes
* UI changes include screenshots
* PR is reviewed

````

---

## `docs/ROADMAP.md`

```md
# Roadmap

## Phase 1A: Hello World Foundation

- Next.js app
- TypeScript
- Bun
- Tailwind
- Prettier
- ESLint
- Husky
- lint-staged
- commitlint
- GitHub Actions
- Docker Postgres/Redis
- Required docs
- GitHub repo

## Phase 1B: App Foundation

- shadcn/ui
- Drizzle
- Better Auth
- Organization model
- Protected dashboard
- App shell

## Phase 2: First Product Module

- Clients
- Projects
- Project workspace
- Milestones
- Internal notes
````

---

# Step 23 — Run full local validation

Run:

```bash
bun install
bun run format
bun run check
docker compose up -d
docker compose ps
bun dev
```

Confirm:

```txt
App opens
Hello World page displays
No lint errors
No type errors
Build passes
Docker services run
```

---

# Step 24 — Initialize Git

Run:

```bash
git init
git add .
git commit -m "chore(setup): initialize project foundation"
```

If commitlint fails, fix the message.

---

# Step 25 — Create GitHub repo

In GitHub:

```txt
Create new repository
Name: freelancer-kit
Visibility: Private
Do not initialize with README
```

Then:

```bash
git branch -M main
git remote add origin git@github.com:YOUR_ORG_OR_USER/freelancer-kit.git
git push -u origin main
```

---

# Step 26 — Confirm GitHub Actions CI

After pushing:

```txt
GitHub repo → Actions
```

Confirm the `CI` workflow runs.

If CI fails, fix locally:

```bash
bun run check
```

Then commit and push again.

---

# Step 27 — Turn on branch protection

Go to:

```txt
GitHub repo → Settings → Branches → Add branch protection rule
```

Branch pattern:

```txt
main
```

Enable:

```txt
Require a pull request before merging
Require approvals: 1
Dismiss stale approvals when new commits are pushed
Require status checks to pass
Require branches to be up to date before merging
Require conversation resolution before merging
Block force pushes
Block deletions
```

Select required status check:

```txt
quality
```

You may need one successful CI run before GitHub shows the check.

---

# Step 28 — Create `dev` branch

After `main` is protected:

```bash
git checkout -b dev
git push -u origin dev
```

Recommended workflow:

```txt
main = production-ready
dev = integration/staging
feature/* = actual work
```

For now, PR feature branches into `dev`. Later, PR `dev` into `main` when stable.

---

# Step 29 — Create first test PR

Create a tiny test branch:

```bash
git checkout -b docs/test-pr-flow
```

Make a small docs change, then:

```bash
git add .
git commit -m "docs(workflow): verify pull request flow"
git push -u origin docs/test-pr-flow
```

Open PR into `dev` or `main`, depending on your chosen workflow.

Confirm:

```txt
PR template appears
CI runs
Review is required
Merge is blocked until checks pass
```

---

# Step 30 — Final Phase 1A acceptance checklist

Phase 1A is done when all are true:

```txt
Bun is the package manager
Next.js app runs locally
Hello World page works
TypeScript strict mode is enabled
Prettier is configured
ESLint runs
Husky pre-commit runs lint-staged
commitlint enforces commit messages
Docker Compose includes Postgres and Redis
.env.example exists
README exists
CONTRIBUTING.md exists
Architecture/code style/git/quality/roadmap docs exist
GitHub Actions CI uses Bun
Repo is pushed to GitHub
main branch is protected
dev branch exists
Test PR flow works
Fresh clone can run app from README
```

---

# What comes after this

Once this is complete, move to **Phase 1B**:

```txt
Install shadcn/ui
Install Drizzle
Connect Postgres
Add Better Auth
Create auth routes
Create organization/membership model
Build protected dashboard shell
```

Do not mix Phase 1A and 1B unless you want a bigger first PR. The cleaner way is:

```txt
PR 1: Hello World foundation
PR 2: shadcn + app shell
PR 3: Drizzle + database connection
PR 4: Better Auth
PR 5: organization/membership foundation
```

[1]: https://bun.com/docs/guides/ecosystem/nextjs?utm_source=chatgpt.com "Build an app with Next.js and Bun - Bun"
[2]: https://nextjs.org/docs/app/api-reference/cli/create-next-app?utm_source=chatgpt.com "CLI: create-next-app | Next.js"
[3]: https://bun.com/docs/pm/cli/install?utm_source=chatgpt.com "bun install - Bun"
[4]: https://typicode.github.io/husky/get-started.html?utm_source=chatgpt.com "Get started | Husky - GitHub Pages"
[5]: https://bun.com/docs/guides/runtime/cicd?utm_source=chatgpt.com "Install and run Bun in GitHub Actions - Bun"
