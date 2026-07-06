// Local runner for the Next.js standalone build.
// Mirrors what the Docker runner stage does: copies `public/` and `.next/static/`
// into `.next/standalone/`, then execs `node .next/standalone/server.js`.
//
// Prod uses Docker (see Dockerfile). This script only exists so `bun run start` works locally.
// Override the port with `PORT=8001 bun run start`.

import { spawn } from "node:child_process";
import { cp, stat } from "node:fs/promises";
import { resolve } from "node:path";

const standaloneDir = resolve(".next/standalone");

try {
  await stat(resolve(standaloneDir, "server.js"));
} catch {
  console.error(
    "✗ .next/standalone/server.js not found. Run `bun run build` first (needs output: 'standalone' in next.config.ts).",
  );
  process.exit(1);
}

await cp("public", resolve(standaloneDir, "public"), {
  recursive: true,
  force: true,
});
await cp(".next/static", resolve(standaloneDir, ".next/static"), {
  recursive: true,
  force: true,
});

const server = spawn("node", ["server.js"], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: process.env,
});

const forwardSignal = (signal: NodeJS.Signals) => () => {
  server.kill(signal);
};
process.on("SIGINT", forwardSignal("SIGINT"));
process.on("SIGTERM", forwardSignal("SIGTERM"));

server.on("exit", (code) => {
  process.exit(code ?? 0);
});
