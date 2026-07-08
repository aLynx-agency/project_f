# Observability

Sentry is wired for error tracking. That's the only observability layer today — no metrics, no traces beyond Sentry Performance, no log aggregation.

## Sentry

The instrumentation is already in place:

- `instrumentation.ts` — server + edge runtime
- `instrumentation-client.ts` — browser
- `withSentryConfig` in `next.config.ts` — source-map upload during build

**Do not run `@sentry/wizard`.** It overwrites these files. Everything the wizard would create is already committed.

### Local dev

Add to `.env.local`:

```
NEXT_PUBLIC_SENTRY_DSN=https://...ingest.<region>.sentry.io/...
```

Leave it blank to disable Sentry locally.

### CI / cluster

- `NEXT_PUBLIC_SENTRY_DSN` — GitHub Actions **Variable**, baked into the client bundle at `docker build`.
- `SENTRY_ORG`, `SENTRY_PROJECT` — GitHub Actions **Variables**, used to label the source-map upload.
- `SENTRY_AUTH_TOKEN` — GitHub Actions **Secret**, used at build time only.

`NEXT_PUBLIC_*` values are **build-time constants**. You cannot inject them at pod runtime — to change the Sentry DSN in prod you must rebuild the image.

### Gotchas

- **Client events go directly to `sentry.io`.** The `tunnelRoute` option is intentionally omitted because `@sentry/nextjs` v10 + Turbopack doesn't auto-generate the route (client beacons would 404). Browser ad blockers may drop events — acceptable tradeoff. Server-side errors are unaffected.
- **Never use `env.NODE_ENV` in client-side code.** `NODE_ENV` is server-only in `src/env.ts`; accessing it via `env.*` on the client throws at runtime. Use `process.env.NODE_ENV` directly — Next.js makes it available on both sides.

## Logs

`kubectl logs` for now. Add Loki / ship to Sentry Logs when the pod count grows.

## Metrics + traces

Not yet. Sentry Performance covers app-level tracing when enabled. Add Prometheus + Grafana if you want cluster / node dashboards later.
