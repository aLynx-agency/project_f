# Architecture

How the pieces of project_f fit together — enough to debug and reason about the system without reading every manifest.

## High level

```
             ┌──────────────┐
             │   Developer  │
             └──────┬───────┘
                    │  git push
                    ▼
             ┌──────────────┐        ┌────────────────────┐
             │    GitHub    │───────▶│  GitHub Actions CI │
             │  (main / tag)│        │  quality → build   │
             └──────────────┘        └─────────┬──────────┘
                    ▲                          │ image
                    │                          ▼
                    │              ┌──────────────────────┐
                    │              │ GHCR                 │
                    │              │ ghcr.io/.../project_f│
                    │              └───────────┬──────────┘
                    │                          │
             overlay bump commit               │ referenced by kustomize
             (kustomization.yaml)              │
                    │                          │
             ┌──────┴───────┐                  │
             │   ArgoCD     │◀─── polls repo ──┘
             │ cd.tryalynx  │
             └──────┬───────┘
                    │  kubectl apply
                    ▼
   ┌────────────────────────────────────────────────────────────┐
   │                    k3s cluster (Oracle Cloud VM)           │
   │                                                            │
   │   ┌───────────────┐    ┌───────────────┐                   │
   │   │  Traefik      │────│ cert-manager  │─── Let's Encrypt  │
   │   │  (ingress)    │    │  (TLS)        │    HTTP-01        │
   │   └───┬───────┬───┘    └───────────────┘                   │
   │       │       │                                            │
   │   staging  production                                      │
   │     ns       ns                                            │
   │   ┌───┴───┐┌──┴────┐                                       │
   │   │ app   ││ app   │  ◀── PreSync Job runs migrations      │
   │   │ pods  ││ pods  │                                       │
   │   └───┬───┘└───┬───┘                                       │
   │       │        │                                           │
   │   ┌───▼───┐┌───▼───┐                                       │
   │   │ CNPG  ││ CNPG  │───── WAL + base backups ──────┐       │
   │   │ pg    ││ pg    │                               │       │
   │   └───────┘└───────┘                               │       │
   │                                                    │       │
   └────────────────────────────────────────────────────┼───────┘
                                                        ▼
                                              ┌────────────────────┐
                                              │  OCI Object Storage│
                                              │  (S3-compat)       │
                                              │  30-day retention  │
                                              └────────────────────┘
```

## Deploy loop

**Staging (automatic):**

```
git push origin main
   ↓ CI: quality job (lint + typecheck + tests + build) — gate
   ↓ CI: build-staging (multi-arch amd64 + arm64) → ghcr.io/.../project_f:staging-<sha>
   ↓ CI: commit kustomization.yaml image-tag bump to main with [skip ci]
   ↓ ArgoCD polls (~3 min) and sees the bump
   ↓ ArgoCD Sync → PreSync Job runs db migrations → app pods roll
   ↓ Traefik routes staging.hub.tryalynx.com → new pod
```

**Production (manual promotion):**

```
git tag v0.1.0 && git push origin v0.1.0
   ↓ CI: build-production → :{version}, :{major.minor}, :latest
   ↓ CI: commit production overlay tag bump with [skip ci]
   ↓ Open https://cd.tryalynx.com, review the diff on project-f-production
   ↓ Click Sync → PreSync migration → pods roll
```

## Component-by-component

### App image

- Built from the top-level `Dockerfile` — three stages: `deps` (bun install) → `builder` (next build + bundle `scripts/migrate.ts`) → `runner` (`node:22-slim` standalone).
- Two build args are baked at image time and cannot be changed at runtime: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`. That means one image per environment.
- The runner image contains `server.js` (Next.js standalone), `migrate.js` (bundled Drizzle migration runner), and `migrations/` (SQL files).

### CI

Single workflow (`.github/workflows/ci.yml`) with three jobs:

- `quality` — runs on PRs + main pushes. Skipped on tags and `[skip ci]` commits. Rolling cancel-in-progress on PR force-pushes.
- `build-staging` — `needs: quality`. Only on main pushes. Publishes `:staging-<sha>` and bumps the staging overlay.
- `build-production` — only on tag pushes. No quality gate (tags are cut from already-verified main code). Publishes semver-labeled images and bumps the production overlay.

Kustomization bumps are `[skip ci]` commits by the `github-actions[bot]` — filtered from both `quality` and Docker jobs to avoid infinite loops.

### Kubernetes manifests

`deploy/k8s/` — base + per-env overlays via Kustomize.

```
deploy/k8s/
  base/
    app/         Deployment, Service, Ingress, migrate-Job
    postgres/    CNPG Cluster + ScheduledBackup
    cluster-issuer.yaml
    traefik-config.yaml
    argocd-ingress.yaml
  overlays/
    staging/     patches destinationPath + image tag
    production/  patches instances, storage size, destinationPath, image tag
```

Each ArgoCD Application (`deploy/argocd/applications.yaml`) points at one of the overlays.

### Database (CNPG)

CloudNativePG operator manages Postgres. In staging: 1 instance, 20Gi. In production: 3 instances, 100Gi.

- The CNPG operator auto-creates a `postgres-app` k8s Secret with app-user credentials. `project-f-secrets.DATABASE_URL` is built from that in the bootstrap step.
- Backups: continuous WAL archiving + daily base backup at 03:00 UTC to OCI Object Storage. 30-day retention. Managed via `spec.backup.barmanObjectStore` and a `ScheduledBackup` CRD.

### Migrations

Runs as an ArgoCD **PreSync hook** Job (`deploy/k8s/base/app/migrate-job.yaml`) using the same image as the app.

- Command: `node migrate.js` (bundled from `scripts/migrate.ts` via `bun build --target node`).
- Reads `DATABASE_URL` from `project-f-secrets`.
- `backoffLimit: 2` — up to 3 attempts. If all fail, the deploy is blocked, running pods stay untouched.
- `hook-delete-policy: BeforeHookCreation` — old Job deleted before each new sync, so logs of the last run remain until the next deploy.

### TLS

cert-manager + Let's Encrypt HTTP-01 challenge. Traefik terminates TLS in front of every ingress.

- `deploy/k8s/base/cluster-issuer.yaml` — Let's Encrypt production issuer.
- `deploy/k8s/base/traefik-config.yaml` — global HTTP→HTTPS redirect.
- Port 80 must be open on the k3s host for the HTTP-01 challenge (even though prod traffic runs on 443).

### ArgoCD

- Exposed at `cd.tryalynx.com` via a k8s Ingress (`deploy/k8s/base/argocd-ingress.yaml`).
- `server.insecure: "true"` in the ArgoCD ConfigMap is required because Traefik terminates TLS in front — without it, `argocd-server` would try its own HTTP→HTTPS redirect and loop.
- Applications: `project-f-staging` (auto-sync), `project-f-production` (manual), and two matching `-postgres` apps.

### Sentry

- Client + server SDK wired via `instrumentation.ts` and `instrumentation-client.ts`.
- Source maps uploaded to Sentry at `docker build` time using `SENTRY_AUTH_TOKEN`.
- DSN is a `NEXT_PUBLIC_*` build arg — one baked-in DSN per image.
- Client beacons go directly to `sentry.io` — the tunnelRoute is intentionally omitted (Turbopack + `@sentry/nextjs` v10 don't auto-generate the route).

See [observability.md](observability.md) for full detail.

## Env vars

Single source of truth is `src/env.ts` — every var carries a JSDoc comment describing scope, defaults, where it comes from, and what it's used for. `.env.example` mirrors it as a template.

Boundaries:

- **`NEXT_PUBLIC_*`** — baked into the client bundle at `docker build`. Cannot be changed at runtime. To change one in prod: rebuild the image.
- **Server-only** — read from k8s Secret `project-f-secrets` at pod startup. Rotate without rebuilding.

## Secrets

Not stored in git. Inventory + rotation runbook: [secrets.md](secrets.md).

## Deployment model in one sentence

_Anyone with kubectl access to a k3s cluster, a domain, and an OCI free-tier account can follow `deploy/README.md` and have a running instance in under an hour — no Terraform, no Ansible._
