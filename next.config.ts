import { withSentryConfig } from "@sentry/nextjs";

import "./src/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Produces .next/standalone for Docker/k8s self-hosting.
  // Vercel ignores this field and uses its own build output — safe to set unconditionally.
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // tunnelRoute is intentionally omitted: @sentry/nextjs 10 + Next 16 (Turbopack) does not
  // auto-generate the route, so client beacons 404. Direct-to-sentry.io is fine for internal use.
  // NOTE: disableLogger + automaticVercelMonitors are webpack-only in @sentry/nextjs 10+.
  // Next 16 uses Turbopack by default, so those options are no-ops. Omit them to silence
  // the deprecation warnings. When/if a webpack build is added, they'd move under
  // `webpack.treeshake.removeDebugLogging` + `webpack.automaticVercelMonitors`.
});
