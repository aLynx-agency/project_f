import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Single source of truth for every environment variable this app reads.
 *
 * Two scopes:
 * - `server`: read only in server code (RSC, server actions, route handlers, scripts). Throws
 *   at runtime if you access it from a client component.
 * - `client`: safe to read from both server and client. Must be prefixed `NEXT_PUBLIC_` and is
 *   baked into the client bundle at `next build` time — you cannot inject these at runtime
 *   via k8s secrets. To change them in prod you must rebuild the image with new build args.
 *
 * Where each secret is created:
 * - Local dev:   `.env.local` (git-ignored). Template is `.env.example`.
 * - CI build:    GitHub Actions → Repository → Variables (for `NEXT_PUBLIC_*`) or Secrets (server).
 * - Cluster:     k8s Secret `project-f-secrets` in each namespace. See deploy/README.md §5.
 *
 * To add a new var: add it to `server` or `client` here (with a description), add it to
 * `runtimeEnv` below, mirror it into `.env.example`, and if it's used in prod wire it into
 * the Dockerfile (build arg for `NEXT_PUBLIC_*`) or the k8s Secret (server-only).
 */
export const env = createEnv({
  server: {
    /**
     * Node runtime mode. Set by Next.js / the runtime, not by you.
     * Default `development` so local scripts work without touching .env.
     */
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    /**
     * Postgres connection string used by the Drizzle client and the PreSync migration Job.
     * On the cluster, the value comes from k8s Secret `project-f-secrets.DATABASE_URL`,
     * which is built from the CNPG-generated `postgres-app` credentials — see deploy/README §5.
     */
    DATABASE_URL: z.string().url(),

    /**
     * Sentry organization slug, used at `next build` time by `withSentryConfig` to upload source
     * maps. Optional; if unset, source-map upload is skipped (release still tagged by DSN).
     */
    SENTRY_ORG: z.string().optional(),

    /**
     * Sentry project slug — same story as `SENTRY_ORG`. Both are set as GitHub Actions
     * Variables on the CI build; not needed at runtime unless server code calls Sentry directly.
     */
    SENTRY_PROJECT: z.string().optional(),

    /**
     * Sentry auth token used only during `docker build` to upload source maps. This is a real
     * secret — lives in GitHub Actions Secrets, not Variables. Never bake into the runtime image.
     * See docs/secrets.md for rotation.
     */
    SENTRY_AUTH_TOKEN: z.string().optional(),
  },
  client: {
    /**
     * Absolute base URL of the running app — used to build callback URLs (auth, Stripe webhooks),
     * canonical links, and og:url tags. Must be HTTPS in prod. Baked at build time.
     */
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    /**
     * Sentry DSN for the browser SDK. Baked into the client bundle at build time; setting this
     * in a k8s secret has no effect. Rebuild the image to change it. Optional in dev — leaving
     * it empty simply disables Sentry.
     */
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  /**
   * Skip validation during `docker build` so the image can compile without real secrets;
   * runtime env is validated on first import in the pod.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
