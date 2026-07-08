# Freelancer Kit

Alynx internal SaaS platform foundation. Next.js 16 + Bun + Drizzle + Postgres, self-hosted on k3s via ArgoCD.

## Scripts

```bash
bun run dev       # start dev server
bun run build     # production build
bun run start     # serve production build
bun run check     # lint + format check + typecheck + tests (CI gate)
bun run fix       # eslint --fix && prettier --write
```

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — start here to code on this repo
- [docs/architecture.md](docs/architecture.md) — system overview: how the pieces talk
- [docs/database.md](docs/database.md) — Drizzle workflow, migrations, conventions
- [docs/observability.md](docs/observability.md) — Sentry setup + gotchas
- [docs/secrets.md](docs/secrets.md) — secret inventory + rotation runbook
- [deploy/README.md](deploy/README.md) — k3s + ArgoCD deployment runbook
