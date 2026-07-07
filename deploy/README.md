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

## One-time setup

### 1. DNS at Squarespace

tryalynx.com → DNS Settings → Custom Records:

```
hub               A   158.101.3.6
staging.hub       A   158.101.3.6
argo              A   158.101.3.6   (optional, if you want ArgoCD UI on a public host later)
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

# Apply the CNPG clusters
kubectl apply -k deploy/k8s/overlays/staging/postgres
kubectl apply -k deploy/k8s/overlays/production/postgres

# Wait for both to reach Healthy state
kubectl -n project-f-staging get clusters postgres -w      # ctrl-c when Healthy
kubectl -n project-f-production get clusters postgres -w
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

Add optional Sentry keys later:

```bash
kubectl -n project-f-staging patch secret project-f-secrets \
  --patch='{"stringData":{"SENTRY_ORG":"alynx","SENTRY_PROJECT":"project-f","SENTRY_AUTH_TOKEN":"..."}}'
```

### 6. GHCR image visibility

The first CI run creates the GHCR package as **private** by default. Either:

- Make the package public: GitHub → your org packages → `project-f` → Package settings → Change visibility → Public. Then delete the `imagePullSecrets` block from `deploy/k8s/base/app/deployment.yaml`.
- **Or** keep it private and create a pull secret in each namespace:

```bash
kubectl -n project-f-staging create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<your-gh-username> \
  --docker-password=<PAT with read:packages scope>
# repeat for project-f-production
```

### 7. Wire up ArgoCD

```bash
# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Port-forward the UI (leave running in a terminal)
kubectl -n argocd port-forward svc/argocd-server 8080:80
# → open http://localhost:8080, login as admin

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
   ↓ Quality CI runs
   ↓ Docker CI builds ghcr.io/.../project-f:staging-<sha>
   ↓ Docker CI commits kustomization.yaml bump to main  [skip ci]
   ↓ ArgoCD sees the commit within ~3 min
   ↓ Syncs to project-f-staging namespace
   ↓ cert-manager issues/reuses cert for staging.hub.tryalynx.com
```

**Production (manual promotion):**

```
git tag -a v0.1.0 -m "First release"
git push origin v0.1.0
   ↓ Docker CI builds ghcr.io/.../project-f:v0.1.0 (+ :latest)
   ↓ Docker CI commits kustomization.yaml bump to main  [skip ci]
   ↓ You open ArgoCD UI, review the diff, click Sync on project-f-production
   ↓ Cluster updates
```

## Common ops

```bash
# Force a fresh deploy without a new commit (staging)
kubectl -n project-f-staging rollout restart deploy/project-f

# Run migrations from your laptop (port-forward the DB first)
kubectl -n project-f-staging port-forward svc/postgres-rw 5432:5432 &
DATABASE_URL="postgres://project_f:${STAGING_PASS}@localhost:5432/project_f?sslmode=require" bun run db:migrate

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

- Expose ArgoCD UI at `argo.tryalynx.com` with SSO (Google or GitHub) instead of port-forward
- CNPG backups to S3/B2 for point-in-time recovery
- HorizontalPodAutoscaler once real traffic arrives
- Prometheus + Grafana or Sentry Performance for observability
