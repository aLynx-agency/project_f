// Liveness/readiness endpoint for k8s probes.
// Kept dependency-free: no DB roundtrip, so a slow Postgres doesn't roll the pods.
// Add a separate /api/ready endpoint that checks DB later if you want a stricter readiness probe.

export const dynamic = "force-static";
export const revalidate = false;

export function GET() {
  return Response.json({ status: "ok" });
}
