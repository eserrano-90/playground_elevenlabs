import { and, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { agentsCache, type Scenario, type Variant } from "@/db/schema";
import { buildAgentBody, configHash } from "./agent-config";
import type { ElevenLabsClient } from "./client";

export type ProvisionOutcome = "reused" | "updated" | "created";

type ProvisionResult = { agentId: string; outcome: ProvisionOutcome };

// Concurrent runs of the same (variant, scenario) share one in-flight provisioning call,
// otherwise both would create an agent and the second cache insert would fail.
const inFlight = new Map<string, Promise<ProvisionResult>>();

/**
 * Ensures a dedicated agent exists for (variant, scenario) with the current config.
 * Reuses on identical hash, PATCHes on change, creates when missing.
 */
export function ensureAgent(
  db: DB,
  el: ElevenLabsClient,
  variant: Variant,
  scenario: Scenario,
): Promise<ProvisionResult> {
  const key = `${variant.id}:${scenario.id}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const p = provision(db, el, variant, scenario).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function provision(
  db: DB,
  el: ElevenLabsClient,
  variant: Variant,
  scenario: Scenario,
): Promise<ProvisionResult> {
  const hash = configHash(variant, scenario);
  const cached = db
    .select()
    .from(agentsCache)
    .where(and(eq(agentsCache.variantId, variant.id), eq(agentsCache.scenarioId, scenario.id)))
    .get();

  if (cached && cached.configHash === hash) return { agentId: cached.agentId, outcome: "reused" };

  const body = buildAgentBody(variant, scenario);
  if (cached) {
    await el.updateAgent(cached.agentId, body);
    db.update(agentsCache)
      .set({ configHash: hash, updatedAt: new Date() })
      .where(and(eq(agentsCache.variantId, variant.id), eq(agentsCache.scenarioId, scenario.id)))
      .run();
    return { agentId: cached.agentId, outcome: "updated" };
  }

  const agentId = await el.createAgent(body);
  db.insert(agentsCache)
    .values({ variantId: variant.id, scenarioId: scenario.id, agentId, configHash: hash })
    .run();
  return { agentId, outcome: "created" };
}

/** Deletes every `bench-` agent in the account and clears the local cache. */
export async function cleanupBenchAgents(db: DB, el: ElevenLabsClient) {
  const agents = await el.listBenchAgents();
  const failed: string[] = [];
  for (const a of agents) {
    try {
      await el.deleteAgent(a.agentId);
    } catch {
      failed.push(a.agentId);
    }
  }
  db.delete(agentsCache).run();
  return { deleted: agents.length - failed.length, failed };
}
