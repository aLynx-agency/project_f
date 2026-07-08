# Secrets

Where each secret lives, when to rotate it, and how.

## Inventory

| Secret                         | Where it lives                           | Used for                                                       |
| ------------------------------ | ---------------------------------------- | -------------------------------------------------------------- |
| `postgres-superuser`           | k8s Secret in each app namespace         | CNPG superuser bootstrap. Never leaves the cluster.            |
| `postgres-app` (auto)          | k8s Secret, auto-created by CNPG         | App-user credentials for the DB. Consumed via `DATABASE_URL`.  |
| `postgres-backup-s3`           | k8s Secret in each app namespace         | OCI Object Storage credentials for CNPG barman backups.        |
| `project-f-secrets`            | k8s Secret in each app namespace         | Runtime env for the app pod (`DATABASE_URL`, optional Sentry). |
| `SENTRY_AUTH_TOKEN`            | GitHub Actions Secret                    | Build-time source-map upload to Sentry.                        |
| `NEXT_PUBLIC_SENTRY_DSN`       | GitHub Actions **Variable**              | Baked into client bundle at `docker build`.                    |
| `SENTRY_ORG`, `SENTRY_PROJECT` | GitHub Actions Variables                 | Sentry release labeling.                                       |
| `NEXT_PUBLIC_APP_URL`          | GitHub Actions Variable                  | Baked into client bundle at `docker build`.                    |
| `ghcr-pull` (optional)         | k8s Secret in each app namespace         | Only if the GHCR image is kept private (see deploy/README §6). |
| ArgoCD admin password          | k8s Secret `argocd-initial-admin-secret` | Login to `cd.tryalynx.com` UI.                                 |

## When to rotate

| Secret                      | Rotate when                                                     | Cadence                   |
| --------------------------- | --------------------------------------------------------------- | ------------------------- |
| Any Sentry / OCI / GHCR PAT | Exposed (chat, screenshot, leaked commit), or a teammate leaves | Immediately + quarterly   |
| ArgoCD admin password       | First login, then when a teammate with access leaves            | On event                  |
| `postgres-superuser`        | Only if compromised                                             | Rarely — cluster-internal |
| `postgres-app`              | CNPG can regenerate; only rotate on compromise                  | Rarely                    |

## How to rotate

### OCI backup credentials

Shared in setup chats → highest-priority rotation.

```bash
# 1. OCI Console → Identity → Users → your user → Customer Secret Keys
#    → Delete old key → Generate new key. Copy the Access Key ID + Secret immediately.

# 2. Update the k8s Secret in each namespace:
kubectl -n project-f-staging create secret generic postgres-backup-s3 \
  --from-literal=ACCESS_KEY_ID='<new-id>' \
  --from-literal=SECRET_ACCESS_KEY='<new-secret>' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n project-f-production create secret generic postgres-backup-s3 \
  --from-literal=ACCESS_KEY_ID='<new-id>' \
  --from-literal=SECRET_ACCESS_KEY='<new-secret>' \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Verify — WAL archiving should stay green:
kubectl -n project-f-staging get cluster postgres \
  -o jsonpath='{.status.conditions[?(@.type=="ContinuousArchiving")]}{"\n"}'
# → expect Status:"True"
```

### Sentry auth token

```bash
# 1. Sentry → Settings → Auth Tokens → revoke the old one → generate a new one
#    with scope: project:releases + org:read.

# 2. GitHub → repo → Settings → Secrets and variables → Actions → Secrets
#    → update SENTRY_AUTH_TOKEN.

# 3. Trigger a rebuild by pushing an empty commit or re-running the last CI job.
#    Confirm source maps upload on the next build.
```

### ArgoCD admin password

```bash
# UI:
#   Open https://cd.tryalynx.com → User Info → Update Password.
#   Use `openssl rand -base64 24` for the new value.

# Then delete the initial-admin-secret so the UI no longer offers it:
kubectl -n argocd delete secret argocd-initial-admin-secret
```

### GHCR pull PAT (if image is kept private)

```bash
# 1. GitHub → Settings → Developer settings → PATs → generate a new fine-grained PAT
#    scoped only to read:packages on this repo.

# 2. Recreate the pull secret in each namespace:
kubectl -n project-f-staging create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<gh-user> \
  --docker-password=<new-PAT> \
  --dry-run=client -o yaml | kubectl apply -f -
# repeat for project-f-production
```

## What NOT to do

- Do not commit any `.env*` file (already `.gitignored`, but check before pushing).
- Do not paste secret values in PR descriptions, GitHub issues, or chat.
- Do not put real secrets in `.env.example` — that file is a template, values must be blank or dummy.
- Do not put `NEXT_PUBLIC_*` values in k8s Secrets — they're baked at build time; the runtime value is ignored.
- Never bypass GitHub secret scanning warnings without rotating the flagged value.
