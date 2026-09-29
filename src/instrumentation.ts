export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Fail fast on boot when required configuration is missing.
  const { getEnv } = await import("@/lib/env");
  getEnv();
  const { recoverStaleRuns } = await import("@/db/recovery");
  recoverStaleRuns();
}
