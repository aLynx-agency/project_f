# Freelancer Kit

Alynx internal SaaS platform foundation.

## Scripts

```bash
bun run dev       # start dev server
bun run build     # production build
bun run start     # serve production build
bun run check     # lint + format check + typecheck (CI gate)
bun run fix       # eslint --fix && prettier --write
```

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — dev workflow, DB/migrations, PR rules, Sentry setup
- [deploy/README.md](deploy/README.md) — k3s + ArgoCD deployment runbook
