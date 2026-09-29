import { getDb } from "@/db/client";
import { handle, intParam, notFound } from "@/lib/api";
import { getElevenLabs } from "@/lib/elevenlabs";
import { getRunDetail } from "@/lib/services/results";

/** Proxies conversation audio so the API key stays server-side. */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/runs/[id]/audio">) => {
  const detail = getRunDetail(getDb(), intParam((await ctx.params).id));
  if (!detail?.conversationId || !detail.hasAudio) throw notFound("Audio");
  const upstream = await getElevenLabs().getConversationAudio(detail.conversationId);
  return new Response(upstream.body, {
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg", "Cache-Control": "private, max-age=3600" },
  });
});
