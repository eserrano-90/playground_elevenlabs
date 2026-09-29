"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type LucideIcon,
  BrainCircuitIcon,
  CoinsIcon,
  DownloadIcon,
  PlayIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SquareIcon,
  Trash2Icon,
  TrophyIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { RunResultRow } from "@/lib/results";
import { aggregateByVariant } from "@/lib/results";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmButton } from "@/components/confirm-button";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { AggregateTable } from "@/components/results/aggregate-table";
import { RunsTable } from "@/components/results/runs-table";
import { ResultsCharts } from "@/components/results/charts";
import { CompareView } from "@/components/results/compare-view";
import { api } from "@/lib/fetcher";
import { Rich } from "@/components/rich";
import { useFormat, useT } from "@/lib/i18n/client";
import type { VariantAggregate } from "@/lib/results";

interface Progress {
  total: number;
  done: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

const POLL_MS = 2000;

export function BenchmarkView({
  benchmark,
  progress: initialProgress,
  rows,
}: {
  benchmark: { id: number; name: string; status: string; repetitions: number; judgeEnabled: boolean; estimatedCostUsd: number | null };
  progress: Progress;
  rows: RunResultRow[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(benchmark.status);
  const [progress, setProgress] = useState(initialProgress);
  const [scenarioFilter, setScenarioFilter] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const lastDone = useRef(initialProgress.done);
  const t = useT();
  const b = t.benchmark;

  // Resync local state when the server component re-renders with fresh props.
  const [synced, setSynced] = useState({ status: benchmark.status, progress: initialProgress });
  if (synced.status !== benchmark.status || synced.progress !== initialProgress) {
    setSynced({ status: benchmark.status, progress: initialProgress });
    setStatus(benchmark.status);
    setProgress(initialProgress);
  }

  // Poll while running; refresh server data whenever a run finishes.
  useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(async () => {
      try {
        const s = await api<{ status: string; progress: Progress }>(`/api/benchmarks/${benchmark.id}/status`);
        setProgress(s.progress);
        setStatus(s.status);
        if (s.progress.done !== lastDone.current || s.status !== "running") {
          lastDone.current = s.progress.done;
          router.refresh();
        }
      } catch (e) {
        toast.error(b.pollError((e as Error).message), { id: "poll" });
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status, benchmark.id, router, b]);

  const scenarios = useMemo(() => uniq(rows.map((r) => ({ id: r.scenarioId, name: r.scenarioName }))), [rows]);
  const variants = useMemo(() => uniq(rows.map((r) => ({ id: r.variantId, name: r.variantName }))), [rows]);
  const aggregates = useMemo(() => aggregateByVariant(rows, scenarioFilter), [rows, scenarioFilter]);
  const filteredRows = useMemo(() => (scenarioFilter == null ? rows : rows.filter((r) => r.scenarioId === scenarioFilter)), [rows, scenarioFilter]);
  const actualCost = rows.reduce((a, r) => a + (r.costUsd ?? 0), 0);

  async function act(path: string, success: string, after?: () => void) {
    setBusy(path);
    try {
      await api(`/api/benchmarks/${benchmark.id}${path}`, { method: "POST" });
      after?.();
      toast.success(success);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    try {
      await api(`/api/benchmarks/${benchmark.id}`, { method: "DELETE" });
      toast.success(b.deleted(benchmark.name));
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const exportHref = (kind: "runs" | "aggregate", format: "csv" | "json") =>
    `/api/benchmarks/${benchmark.id}/results?kind=${kind}&format=${format}&download${kind === "aggregate" && scenarioFilter != null ? `&scenarioId=${scenarioFilter}` : ""}`;
  const canStart = status === "draft" || status === "cancelled" || (status === "completed" && progress.failed > 0);

  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  const busyIcon = (path: string, Icon: LucideIcon) =>
    busy === path ? <Spinner data-icon="inline-start" /> : <Icon data-icon="inline-start" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/" className="hover:text-foreground">
            {b.eyebrow}
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{benchmark.name}</span>
            <StatusBadge status={status} />
          </span>
        }
        description={
          <>
            {b.summary(variants.length, scenarios.length, benchmark.repetitions)}
            {benchmark.judgeEnabled ? b.judgeOn : ""}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2" data-tour="benchmark-actions">
            {status === "running" ? (
              <ConfirmButton
                variant="outline"
                disabled={!!busy}
                title={b.cancelTitle}
                description={b.cancelDescription}
                confirmLabel={b.cancelConfirm}
                onConfirm={() => act("/cancel", b.cancelled, () => setStatus("cancelled"))}
              >
                {busyIcon("/cancel", SquareIcon)}
                {b.cancel}
              </ConfirmButton>
            ) : null}
            {canStart ? (
              <Button disabled={!!busy} onClick={() => act("/start", b.started, () => setStatus("running"))}>
                {busyIcon("/start", status === "draft" ? PlayIcon : RotateCcwIcon)}
                {status === "draft" ? b.start : progress.failed || progress.cancelled ? b.retry : b.resume}
              </Button>
            ) : null}
            {status !== "running" && progress.completed > 0 ? (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="outline" disabled={!!busy} onClick={() => act("/reanalyze", b.reanalyzed)} />}
                >
                  {busyIcon("/reanalyze", RefreshCwIcon)}
                  {b.reanalyze}
                </TooltipTrigger>
                <TooltipContent>{b.reanalyzeTooltip}</TooltipContent>
              </Tooltip>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" disabled={rows.length === 0} />}>
                <DownloadIcon data-icon="inline-start" />
                {b.export}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["aggregate", "runs"] as const).map((kind, i) => (
                  <DropdownMenuGroup key={kind}>
                    {i > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuLabel>{kind === "runs" ? b.exportRuns : b.exportAggregate}</DropdownMenuLabel>
                    {(["csv", "json"] as const).map((format) => (
                      <DropdownMenuItem key={format} render={<a href={exportHref(kind, format)} />}>
                        {format.toUpperCase()}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {status !== "running" ? (
              <ConfirmButton
                variant="ghost"
                size="icon"
                aria-label={b.deleteLabel}
                title={b.deleteTitle(benchmark.name)}
                description={b.deleteDescription}
                confirmLabel={t.common.delete}
                onConfirm={remove}
              >
                <Trash2Icon />
              </ConfirmButton>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium tabular-nums">
            {b.runsDone(progress.done, progress.total)}
          </span>
          <span className="text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
        </div>
        <Progress value={pct} aria-label={b.progressLabel} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span>{b.completed(progress.completed)}</span>
          <span>{b.running(progress.running)}</span>
          <span>{b.pending(progress.pending)}</span>
          {progress.failed ? <span className="text-destructive">{b.failed(progress.failed)}</span> : null}
          {progress.cancelled ? <span>{b.cancelledCount(progress.cancelled)}</span> : null}
        </div>
      </div>

      <Highlights aggregates={aggregates} actualCost={actualCost} estimatedCost={benchmark.estimatedCostUsd} />

      <Tabs defaultValue="results">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList data-tour="benchmark-tabs">
            <TabsTrigger value="results">{b.tabs.results}</TabsTrigger>
            <TabsTrigger value="charts">{b.tabs.charts}</TabsTrigger>
            <TabsTrigger value="compare">{b.tabs.compare}</TabsTrigger>
            <TabsTrigger value="runs">{b.tabs.runs}</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              className="w-52"
              aria-label={b.filterLabel}
              value={scenarioFilter ?? ""}
              onChange={(e) => setScenarioFilter(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{b.allScenarios}</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <TabsContent value="results" className="pt-4">
          <AggregateTable data={aggregates} />
          <p className="mt-3 text-xs text-muted-foreground">
            <Rich text={b.footnote} />{" "}
            <Link href="/metrics" className="underline underline-offset-4 hover:text-foreground">
              {b.howMetrics}
            </Link>
          </p>
        </TabsContent>
        <TabsContent value="charts" className="pt-4">
          <ResultsCharts data={aggregates} />
        </TabsContent>
        <TabsContent value="compare" className="pt-4">
          <CompareView benchmarkId={benchmark.id} scenarios={scenarios} variants={variants} />
        </TabsContent>
        <TabsContent value="runs" className="pt-4">
          <RunsTable data={filteredRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Best variant per headline metric, plus spend so far. */
function Highlights({
  aggregates,
  actualCost,
  estimatedCost,
}: {
  aggregates: VariantAggregate[];
  actualCost: number;
  estimatedCost: number | null;
}) {
  const b = useT().benchmark;
  const f = useFormat();
  const best = (pick: (a: VariantAggregate) => number | null, dir: 1 | -1) =>
    aggregates.reduce<{ a: VariantAggregate; v: number } | null>((acc, a) => {
      const v = pick(a);
      return v == null || (acc && (v - acc.v) * dir >= 0) ? acc : { a, v };
    }, null);

  const cheapest = best((a) => a.costPerMinuteUsd.mean, 1);
  const fastest = best((a) => a.latencyMeanMs.mean, 1);
  const richest = best((a) => a.compositeScore.mean, -1);

  const cards = [
    { label: b.cheapest, icon: CoinsIcon, value: cheapest ? f.usd(cheapest.v, 4) : null, who: cheapest?.a.variantName },
    { label: b.fastest, icon: ZapIcon, value: fastest ? f.ms(fastest.v) : null, who: fastest?.a.variantName },
    { label: b.richest, icon: BrainCircuitIcon, value: richest ? `${f.num(richest.v, 1)} / 100` : null, who: richest?.a.variantName },
    {
      label: b.spent,
      icon: TrophyIcon,
      value: f.usd(actualCost, 4),
      who: estimatedCost != null ? b.ofEstimated(f.usd(estimatedCost, 2)) : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="benchmark-highlights">
      {cards.map((c) => (
        <Card key={c.label} size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <c.icon className="size-4" />
              {c.label}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{c.value ?? "—"}</CardTitle>
            <CardDescription className="truncate">{c.who ?? b.waiting}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function uniq<T extends { id: number }>(xs: T[]): T[] {
  const seen = new Map<number, T>();
  for (const x of xs) if (!seen.has(x.id)) seen.set(x.id, x);
  return [...seen.values()];
}
