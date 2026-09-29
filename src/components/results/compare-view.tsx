"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ColumnsIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { ErrorBanner } from "@/components/field";
import { api } from "@/lib/fetcher";
import { useFormat, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface Turn {
  index: number;
  role: "agent" | "user";
  message: string;
  llmTtfbMs: number | null;
  ttsTtfbMs: number | null;
}
interface Transcript {
  variantId: number;
  variantName: string;
  runId: number;
  turns: Turn[];
}

export function CompareView({
  benchmarkId,
  scenarios,
  variants,
}: {
  benchmarkId: number;
  scenarios: { id: number; name: string }[];
  variants: { id: number; name: string }[];
}) {
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? 0);
  const [selected, setSelected] = useState<number[]>(variants.slice(0, 2).map((v) => v.id));
  const [data, setData] = useState<Transcript[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = useT().results.compare;

  useEffect(() => {
    if (selected.length < 2 || !scenarioId) return;
    let cancelled = false;
    api<Transcript[]>(`/api/benchmarks/${benchmarkId}/compare?scenarioId=${scenarioId}&variantIds=${selected.join(",")}`)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [benchmarkId, scenarioId, selected]);

  if (variants.length < 2) return (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ColumnsIcon />
            </EmptyMedia>
            <EmptyTitle>{c.nothingTitle}</EmptyTitle>
            <EmptyDescription>{c.nothingDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );

  const maxIndex = Math.max(-1, ...(data ?? []).flatMap((t) => t.turns.map((x) => x.index)));
  const indices = Array.from({ length: maxIndex + 1 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <NativeSelect className="w-60" aria-label={c.scenario} value={scenarioId} onChange={(e) => setScenarioId(Number(e.target.value))}>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        {variants.map((v) => (
          <Label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 font-normal has-data-checked:border-primary/50 has-data-checked:bg-primary/5">
            <Checkbox
              checked={selected.includes(v.id)}
              onCheckedChange={(c) => setSelected((s) => (c ? [...s, v.id] : s.filter((x) => x !== v.id)))}
            />
            {v.name}
          </Label>
        ))}
      </div>
      <ErrorBanner message={error} />
      {selected.length < 2 ? (
(
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ColumnsIcon />
            </EmptyMedia>
            <EmptyTitle>{c.pickTitle}</EmptyTitle>
            <EmptyDescription>{c.pickDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
      ) : data && data.length === 0 ? (
(
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ColumnsIcon />
            </EmptyMedia>
            <EmptyTitle>{c.noRunsTitle}</EmptyTitle>
            <EmptyDescription>{c.noRunsDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
      ) : data ? (
        <div className="overflow-x-auto">
          <div className="grid gap-3" style={{ gridTemplateColumns: `3rem repeat(${data.length}, minmax(260px, 1fr))` }}>
            <div />
            {data.map((t) => (
              <Link key={t.variantId} href={`/runs/${t.runId}`} className="font-medium underline-offset-4 hover:underline">
                {t.variantName} <span className="text-xs text-muted-foreground">{c.runLabel(t.runId)}</span>
              </Link>
            ))}
            {indices.map((i) => (
              <Row key={i} index={i} transcripts={data} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {selected.map((id) => (
            <div key={id} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20" />
              <Skeleton className="h-14" />
              <Skeleton className="h-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ index, transcripts }: { index: number; transcripts: Transcript[] }) {
  const c = useT().results.compare;
  const f = useFormat();
  return (
    <>
      <div className="pt-2 text-xs text-muted-foreground">#{index}</div>
      {transcripts.map((t) => {
        const turn = t.turns.find((x) => x.index === index);
        if (!turn) return <div key={t.variantId} />;
        const latency = turn.role === "agent" && (turn.llmTtfbMs != null || turn.ttsTtfbMs != null) ? (turn.llmTtfbMs ?? 0) + (turn.ttsTtfbMs ?? 0) : null;
        return (
          <div
            key={t.variantId}
            className={cn("rounded-lg border px-3 py-2 text-sm", turn.role === "agent" ? "bg-muted/50" : "border-dashed")}
          >
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{c[turn.role]}</span>
              {latency != null ? <span className="tabular-nums">{f.ms(latency)}</span> : null}
            </div>
            <p className="whitespace-pre-wrap">{turn.message}</p>
          </div>
        );
      })}
    </>
  );
}
