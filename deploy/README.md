# Deploy

k3s + CNPG + cert-manager + ArgoCD deployment of project-f.

- **Node public IP:** `158.101.3.6`
- **Staging URL:** `https://staging.hub.tryalynx.com`
- **Production URL:** `https://hub.tryalynx.com`
- **GHCR image:** `ghcr.io/alynx-agency/project_f`

Change `aLynx-agency` throughout the repo if you're using a different GitHub org:

```bash
grep -RIl "alynx-agency/project_f" | xargs sed -i 's#alynx-agency/project_f#your-org/project_f#g'
```

---

## Prerequisites

Before starting the runbook, make sure you have:

- [ ] A domain you can add DNS records to (this repo uses `tryalynx.com`)
- [ ] A k3s cluster (single-node is fine) with `kubectl` access from your laptop
- [ ] Admin access to the k3s host (to open firewall ports)
- [ ] A GitHub account with write access to the fork/mirror of this repo (CI commits image-tag bumps)
- [ ] An OCI (Oracle Cloud) account for Postgres backups — Always Free tier is enough
- [ ] `yq` installed locally if you need to hand-edit Kustomize overlays

---

## One-time setup

### 1. DNS at Squarespace

tryalynx.com → DNS Settings → Custom Records:

```
hub               A   158.101.3.6
staging.hub       A   158.101.3.6
cd                A   158.101.3.6   (ArgoCD UI at cd.tryalynx.com)
```

Wait for propagation then verify:

```bash
dig +short hub.tryalynx.com staging.hub.tryalynx.com
# both should return 158.101.3.6
```

### 2. Firewall on the k3s host

Ports 80 and 443 open to `0.0.0.0/0`. Port 80 is required for cert-manager's HTTP-01 challenge (even though production traffic runs on 443).

### 3. Install cluster-level components (once per cluster)

Run these on the k3s host:

```bash
# cert-manager (TLS via Let's Encrypt)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml
kubectl -n cert-manager wait --for=condition=Available deploy --all --timeout=180s

# CloudNative-PG operator (Postgres)
kubectl apply --server-side -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.24/releases/cnpg-1.24.1.yaml
kubectl -n cnpg-system wait --for=condition=Available deploy/cnpg-controller-manager --timeout=120s

# ArgoCD (GitOps controller)
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd wait --for=condition=Available deploy --all --timeout=180s

# App namespaces
kubectl create namespace project-f-staging
kubectl create namespace project-f-production

# ClusterIssuer (Let's Encrypt account, harsh@alynx.agency)
kubectl apply -f https://raw.githubusercontent.com/aLynx-agency/project_f/main/deploy/k8s/base/cluster-issuer.yaml
# ...or apply from the local clone:
#   kubectl apply -f deploy/k8s/base/cluster-issuer.yaml

# Traefik: global HTTP→HTTPS redirect
kubectl apply -f https://raw.githubusercontent.com/aLynx-agency/project_f/main/deploy/k8s/base/traefik-config.yaml
# ...or apply from the local clone:
#   kubectl apply -f deploy/k8s/base/traefik-config.yaml

# ArgoCD UI at cd.tryalynx.com (apply after ArgoCD install above)
kubectl apply -f deploy/k8s/base/argocd-ingress.yaml
kubectl -n argocd rollout restart deploy/argocd-server
```

### 4. Postgres bootstrap (per environment)

```bash
# Superuser secret (one per env — value never leaves the cluster)
kubectl -n project-f-staging create secret generic postgres-superuser \
  --from-literal=username=postgres \
  --from-literal=password="$(openssl rand -base64 32)"
kubectl -n project-f-production create secret generic postgres-superuser \
  --from-literal=username=postgres \
  --from-literal=password="$(openssl rand -base64 32)"

# Backup credentials (see step 4b below for how to generate these in OCI)
kubectl -n project-f-staging create secret generic postgres-backup-s3 \
  --from-literal=ACCESS_KEY_ID='<oci-access-key-id>' \
  --from-literal=SECRET_ACCESS_KEY='<oci-secret-key>'
kubectl -n project-f-production create secret generic postgres-backup-s3 \
  --from-literal=ACCESS_KEY_ID='<oci-access-key-id>' \
  --from-literal=SECRET_ACCESS_KEY='<oci-secret-key>'

# Apply the CNPG clusters
kubectl apply -k deploy/k8s/overlays/staging/postgres
kubectl apply -k deploy/k8s/overlays/production/postgres

# Wait for both to reach Healthy state
kubectl -n project-f-staging get clusters postgres -w      # ctrl-c when Healthy
kubectl -n project-f-production get clusters postgres -w
```

### 4b. Postgres backups on OCI Object Storage

Continuous WAL archiving + daily base backup at 03:00 UTC, 30-day retention, gzipped. Uses OCI's S3-compatibility API (Always Free tier: 20 GiB storage, 50k API calls/month).

**One-time OCI Console setup:**

1. **Storage → Object Storage & Archive Storage → Buckets → Create Bucket** named `project-f-backups` (Standard tier, keep Private)
2. Click into the bucket → note the **Namespace** field (a random string like `axpravmkmffk`) and your **Region** (e.g. `us-phoenix-1`)
3. **Identity & Security → Users → your user → Customer Secret Keys → Generate Secret Key** named `project-f-cnpg`. **Copy the secret immediately — shown only once.** Also copy the Access Key ID from the resulting table row.

**Endpoint URL is hardcoded** in `deploy/k8s/base/postgres/cluster.yaml` as `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com`. If you rotate to a different OCI region or account, update that string.

**Verify backups after cluster is Healthy:**

```bash
# Confirm CNPG picked up the config
kubectl -n project-f-staging get cluster postgres \
  -o jsonpath='{.status.conditions[?(@.type=="ContinuousArchiving")]}{"\n"}'
# → expect Status:"True"

# Trigger a manual base backup to test connectivity end-to-end
kubectl -n project-f-staging create -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: manual-verify-$(date +%s)
spec:
  cluster:
    name: postgres
EOF

kubectl -n project-f-staging get backups -w   # ctrl-c when "completed"
```

Open the OCI bucket in the console — you'll see `staging/` and (after prod is bootstrapped) `production/` prefixes, each with `base/` and `wals/` subdirs.

**Rotating OCI credentials:**

```bash
# Generate a new Customer Secret Key in OCI Console (deletes the old one).
kubectl -n project-f-staging create secret generic postgres-backup-s3 \
  --from-literal=ACCESS_KEY_ID='<new-id>' \
  --from-literal=SECRET_ACCESS_KEY='<new-secret>' \
  --dry-run=client -o yaml | kubectl apply -f -
# repeat for project-f-production
```

### 5. App runtime secrets (per environment)

CNPG auto-creates `postgres-app` secret with the app-user credentials. Wire that into the app's secret:

```bash
# Staging
STAGING_PASS=$(kubectl -n project-f-staging get secret postgres-app -o jsonpath='{.data.password}' | base64 -d)
kubectl -n project-f-staging create secret generic project-f-secrets \
  --from-literal=DATABASE_URL="postgres://project_f:${STAGING_PASS}@postgres-rw:5432/project_f?sslmode=require"

# Production
PROD_PASS=$(kubectl -n project-f-production get secret postgres-app -o jsonpath='{.data.password}' | base64 -d)
kubectl -n project-f-production create secret generic project-f-secrets \
  --from-literal=DATABASE_URL="postgres://project_f:${PROD_PASS}@postgres-rw:5432/project_f?sslmode=require"
```

**Sentry credentials — two places, two purposes:**

| Where                                    | What                                                                            | Why                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions → **Variables**           | `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_APP_URL`, `SENTRY_ORG`, `SENTRY_PROJECT` | `NEXT_PUBLIC_*` is baked into the client bundle at `docker build` time; Sentry org/project label the source-map upload |
| GitHub Actions → **Secrets**             | `SENTRY_AUTH_TOKEN`                                                             | Used at build time to upload source maps to Sentry                                                                     |
| k8s `project-f-secrets` (patch as below) | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (optional)                  | Runtime access from server-side code, if ever needed                                                                   |

Client-side events flow **directly to sentry.io** (no tunnel route — Turbopack in Next 16 doesn't auto-generate one). Browser ad blockers may drop them; most users don't run aggressive blockers, and server-side errors are unaffected.

Optional k8s runtime patch (only if server code needs these at runtime):

```bash
kubectl -n project-f-staging patch secret project-f-secrets \
  --patch='{"stringData":{"SENTRY_ORG":"alynx-e6","SENTRY_PROJECT":"project_f","SENTRY_AUTH_TOKEN":"..."}}'
```

### 6. GHCR image visibility

The first CI run creates the GHCR package as **private** by default. The k8s manifests do not include an `imagePullSecrets` block, so as-is pods can only pull a **public** image. Pick one:

- **A) Make the image public** (simplest — repo can still be private): GitHub → your org packages → `project-f` → Package settings → Change visibility → Public. No k8s changes needed.
- **B) Keep the image private:** create a pull secret in each namespace **and** add an `imagePullSecrets` block to `deploy/k8s/base/app/deployment.yaml`'s pod spec (`imagePullSecrets: [{ name: ghcr-pull }]`).

```bash
# For option B only:
kubectl -n project-f-staging create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<your-gh-username> \
  --docker-password=<PAT with read:packages scope>
# repeat for project-f-production
```

### 7. Wire up ArgoCD

```bash
# Get initial admin password (rotate via Account → Update Password after first login)
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# → open https://cd.tryalynx.com, login as admin

# If the repo is private, add repo credentials in the UI:
# Settings → Repositories → Connect repo → HTTPS → paste GitHub PAT with repo read scope.

# Apply the Applications (staging + production, app + postgres each)
kubectl apply -f deploy/argocd/applications.yaml
```

In the ArgoCD UI you'll now see 4 Applications:

| Name                            | Sync policy                      | Notes                                    |
| ------------------------------- | -------------------------------- | ---------------------------------------- |
| `project-f-staging`             | **Automated** (prune + selfHeal) | Every commit to main flows here          |
| `project-f-production`          | **Manual**                       | Click "Sync" after CI commits a tag bump |
| `project-f-staging-postgres`    | Manual                           | Sync once initially; leave alone         |
| `project-f-production-postgres` | Manual                           | Same                                     |

---

## Deploy loop from here

**Staging (automatic):**

```
git push origin main
   ↓ CI: quality job runs (lint + typecheck + tests + build)
   ↓ CI: build-staging fires ONLY if quality passed → ghcr.io/.../project-f:staging-<sha>
   ↓ CI commits kustomization.yaml bump to main  [skip ci]
   ↓ ArgoCD sees the commit within ~3 min
   ↓ Syncs to project-f-staging namespace
   ↓ cert-manager issues/reuses cert for staging.hub.tryalynx.com
```

**Production (manual promotion):**

```
git tag -a v0.1.0 -m "First release"
git push origin v0.1.0
   ↓ CI: build-production runs (no quality gate — tag is only cut from already-verified main code)
   ↓ Image published as ghcr.io/.../project-f:0.1.0 (+ :0.1, :latest)
   ↓ CI commits kustomization.yaml bump to main  [skip ci]
   ↓ Open https://cd.tryalynx.com, review the diff, click Sync on project-f-production
   ↓ Cluster updates
```

## Common ops

```bash
# Force a fresh deploy without a new commit (staging)
kubectl -n project-f-staging rollout restart deploy/project-f

# Migrations run automatically as an ArgoCD PreSync Job before each deploy.
# To run manually (e.g. hotfix outside a deploy):
kubectl -n project-f-staging port-forward svc/postgres-rw 5432:5432 &
DATABASE_URL="postgres://project_f:${STAGING_PASS}@localhost:5432/project_f?sslmode=require" bun run db:migrate

# Check the last migration job's logs
kubectl -n project-f-staging logs job/db-migrate

# Tail app logs
kubectl -n project-f-staging logs -f deploy/project-f

# psql shell
kubectl -n project-f-staging exec -it postgres-1 -- psql -U project_f

# Rollback via ArgoCD UI: pick the previous revision → Sync. Or force one image tag:
kubectl -n project-f-staging set image deploy/project-f app=ghcr.io/alynx-agency/project_f:staging-<older-sha>
```

## Verifying it's live

```bash
curl -sS https://staging.hub.tryalynx.com/api/health
# → {"status":"ok"}
curl -sS https://hub.tryalynx.com/api/health
# → {"status":"ok"}
```

Both should return HTTP 200 with a valid Let's Encrypt cert (green padlock in browser).

## Later hardening

- Add SSO to ArgoCD UI (Google or GitHub) instead of the built-in admin account
- CNPG backups to S3/B2 for point-in-time recovery
- HorizontalPodAutoscaler once real traffic arrives
- Prometheus + Grafana or Sentry Performance for observability
