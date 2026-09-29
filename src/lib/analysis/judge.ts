import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getAiModel } from "@/lib/ai/model";
import type { JudgeCriterion } from "@/db/schema";

export const JUDGE_CRITERIA: JudgeCriterion[] = ["relevance", "depth", "coherence", "adherence"];

const score = z.number().int().min(1).max(5);
export const judgeOutputSchema = z.object({
  relevance: z.object({ score, rationale: z.string() }),
  depth: z.object({ score, rationale: z.string() }),
  coherence: z.object({ score, rationale: z.string() }),
  adherence: z.object({ score, rationale: z.string() }),
});
export type JudgeOutput = z.infer<typeof judgeOutputSchema>;

export const JUDGE_RUBRIC = `You are an impartial evaluator of voice-agent conversations.
Score the AGENT (not the user) on each criterion from 1 (very poor) to 5 (excellent):
- relevance: responses address what the user actually asked.
- depth: responses provide substantive, informative content rather than generic filler.
- coherence: responses are logically organized, consistent, and easy to follow when spoken aloud.
- adherence: responses follow the agent's system prompt (role, constraints, tone, language).
Give a one-sentence rationale per criterion. Judge only what is in the transcript.`;

export function formatTranscript(turns: { role: string; message: string }[]): string {
  return turns.map((t) => `${t.role.toUpperCase()}: ${t.message}`).join("\n");
}

export async function judgeTranscript(
  systemPrompt: string,
  turns: { role: string; message: string }[],
): Promise<{ judgeModel: string; output: JudgeOutput }> {
  const { model, id } = getAiModel("judge");
  const { output } = await generateText({
    model,
    temperature: 0,
    system: JUDGE_RUBRIC,
    output: Output.object({ schema: judgeOutputSchema }),
    prompt: `AGENT SYSTEM PROMPT:\n${systemPrompt}\n\nTRANSCRIPT:\n${formatTranscript(turns)}`,
  });
  return { judgeModel: id, output };
}
