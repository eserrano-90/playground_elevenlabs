import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { JUDGE_CRITERIA } from "@/lib/analysis/judge";
import { COMPOSITE_WEIGHTS } from "@/lib/analysis/composite";
import { turnLatencyMs } from "@/lib/services/analysis";
import { getRunDetail } from "@/lib/services/results";
import { BotIcon, CircleAlertIcon, UserRoundIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/page-header";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { getFormat, getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

export default async function RunPage({ params }: PageProps<"/runs/[id]">) {
  const id = Number((await params).id);
  const detail = Number.isInteger(id) ? getRunDetail(getDb(), id) : null;
  if (!detail) notFound();
  const { row: r, turns, judge } = detail;
  const locale = await getLocale();
  const t = (await getT()).runs;
  const f = getFormat(locale);
  const readabilityLabel =
    t.readability[(r.readabilityFormula ?? "") as keyof typeof t.readability] ?? t.readability["flesch-kincaid-grade"];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          r.benchmarkId ? (
            <Link href={`/benchmarks/${r.benchmarkId}`} className="hover:text-foreground">
              {t.benchmarkEyebrow(r.benchmarkId)}
            </Link>
          ) : (
            <Link href="/live" className="hover:text-foreground">
              {t.liveRuns}
            </Link>
          )
        }
        title={
          <span className="flex items-center gap-3">
            {t.title(r.runId)} <StatusBadge status={r.status} />
          </span>
        }
        description={
          <span className="flex flex-col gap-2">
            <span>
              <span className="font-medium text-foreground">{r.variantName}</span> {t.on} “{r.scenarioName}”
            </span>
            <span className="flex flex-wrap gap-1">
              <Badge variant="outline">{r.llm}</Badge>
              <Badge variant="outline">{r.ttsModel}</Badge>
              <Badge variant="outline">{r.voiceName ?? r.voiceId}</Badge>
              <Badge variant="secondary">{t.mode[r.mode] ?? r.mode}</Badge>
              <Badge variant="secondary">{t.repetition(r.repetition)}</Badge>
              {detail.conversationId ? (
                <Badge variant="outline" className="font-mono">
                  {detail.conversationId}
                </Badge>
              ) : null}
            </span>
          </span>
        }
      />
      {r.error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t.failed}</AlertTitle>
          <AlertDescription>{r.error}</AlertDescription>
        </Alert>
      ) : null}
      {detail.noOutput ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{t.noOutput}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t.transcript}</CardTitle>
            {detail.hasAudio && detail.conversationId ? (
              <audio controls preload="none" src={`/api/runs/${r.runId}/audio`} className="mt-2 w-full" />
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {turns.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{t.noTranscriptTitle}</EmptyTitle>
                  <EmptyDescription>{t.noTranscriptDescription}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {turns.map((turn) => {
              const latency = turnLatencyMs(turn);
              return (
                <div key={turn.id} className={cn("flex items-end gap-2", turn.role === "agent" ? "justify-start" : "flex-row-reverse")}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {turn.role === "agent" ? <BotIcon className="size-4" /> : <UserRoundIcon className="size-4" />}
                  </span>
                  <div className={cn("max-w-[80%] rounded-lg border px-3 py-2 text-sm", turn.role === "agent" ? "bg-muted/50" : "border-dashed")}>
                    <div className="mb-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
                      <span className="capitalize">
                        #{turn.index} {t.role[turn.role]}
                      </span>
                      {turn.timeInCallSecs != null ? <span>{f.secs(turn.timeInCallSecs)}</span> : null}
                      {latency != null ? (
                        <span title={`LLM ${f.ms(turn.llmTtfbMs)} · TTS ${f.ms(turn.ttsTtfbMs)}`}>{t.latency(f.ms(latency))}</span>
                      ) : null}
                      {turn.llmOutputTokens != null ? (
                        <span>
                          {turn.llmInputTokens ?? 0}→{turn.llmOutputTokens} tok
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap">{turn.message}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t.cost} <SourceBadge source={r.costSource} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Stat label={t.total}>{f.usd(r.costUsd)}</Stat>
              <Stat label={t.perMinute}>{f.usd(r.costPerMinuteUsd)}</Stat>
              <Stat label={t.perAgentTurn}>{f.usd(r.costPerTurnUsd)}</Stat>
              <Stat label={t.voiceAgent}>{f.usd(r.voiceCostUsd)}</Stat>
              <Stat label={t.llm}>{f.usd(r.llmCostUsd)}</Stat>
              <Stat label={t.llmTokens}>
                {r.llmInputTokens ?? "—"} / {r.llmOutputTokens ?? "—"}
              </Stat>
              <Stat label={t.duration}>
                {f.secs(r.durationSecs)} <SourceBadge source={r.durationSource} />
              </Stat>
              <Stat label={t.wallClock}>{r.wallClockMs != null ? f.secs(r.wallClockMs / 1000) : "—"}</Stat>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t.latencyTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <Stat label={t.latencyMean}>{f.ms(r.latencyMeanMs)}</Stat>
              <Stat label="p95">{f.ms(r.latencyP95Ms)}</Stat>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t.complexity}</CardTitle>
              <CardDescription>
                {t.weights({
                  words: f.num(COMPOSITE_WEIGHTS.avgWordsPerResponse, 2),
                  sentence: f.num(COMPOSITE_WEIGHTS.avgSentenceLength, 2),
                  readability: f.num(COMPOSITE_WEIGHTS.readability, 2),
                  lexical: f.num(COMPOSITE_WEIGHTS.lexicalDiversity, 2),
                  judge: f.num(COMPOSITE_WEIGHTS.judge, 2),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Stat label={t.composite}>{f.num(r.compositeScore)}</Stat>
              <Stat label={t.agentTurns}>{r.agentTurns ?? "—"}</Stat>
              <Stat label={t.wordsPerResponse}>{f.num(r.avgWordsPerResponse)}</Stat>
              <Stat label={t.avgSentenceLength}>{f.num(r.avgSentenceLength)}</Stat>
              <Stat label={readabilityLabel}>{f.num(r.readabilityGrade)}</Stat>
              <Stat label={t.lexicalDiversity}>{f.num(r.lexicalDiversity, 3)}</Stat>
            </CardContent>
          </Card>

          {judge ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{t.judge}</CardTitle>
                <CardDescription>{judge.judgeModel}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {JUDGE_CRITERIA.map((c) => (
                  <div key={c} className="text-sm">
                    <div className="flex justify-between font-medium capitalize">
                      <span>{t.criteria[c]}</span>
                      <span className="tabular-nums">{judge[c]}/5</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{judge.rationale[c]}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
