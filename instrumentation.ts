import * as Sentry from "@sentry/nextjs";

import { env } from "@/env";

export function register() {
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
