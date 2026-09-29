"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Stats } from "@/lib/cost/aggregate";
import type { VariantAggregate } from "@/lib/results";
import type { Formatters } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useFormat, useT } from "@/lib/i18n/client";
import { SourceBadge } from "@/components/status-badge";
import { SortableTable, sortableFeatures, type SortableColumns } from "./sortable-table";

const helper = createColumnHelper<typeof sortableFeatures, VariantAggregate>();

/** Mean with min–max range underneath when there are several repetitions. */
function StatCell({ s, fmt }: { s: Stats; fmt: (v: number | null) => string }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium tabular-nums">{fmt(s.mean)}</span>
      {s.n > 1 ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {fmt(s.min)}–{fmt(s.max)} · σ {fmt(s.std)}
        </span>
      ) : null}
    </div>
  );
}

function statColumn(
  id: string,
  header: string,
  pick: (a: VariantAggregate) => Stats,
  fmt: (v: number | null) => string,
) {
  return helper.accessor((a) => pick(a).mean ?? undefined, {
    id,
    header,
    sortUndefined: "last",
    cell: (ctx) => <StatCell s={pick(ctx.row.original)} fmt={fmt} />,
  });
}

const buildColumns = ({ results: { col } }: Dictionary, f: Formatters) => {
  const usd4 = (v: number | null) => f.usd(v, 4);
  return [
    helper.accessor("variantName", {
      header: col.variant,
      cell: (ctx) => {
        const a = ctx.row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{a.variantName}</span>
            <span className="text-xs text-muted-foreground">
              {a.llm} · {a.ttsModel} · {a.voiceName}
            </span>
          </div>
        );
      },
    }),
    helper.accessor("runs", { header: col.runs }),
    helper.accessor((a) => a.costPerMinuteUsd.mean ?? undefined, {
      id: "costPerMinute",
      header: col.costPerMin,
      sortUndefined: "last",
      cell: (ctx) => (
        <div className="flex items-start gap-2">
          <StatCell s={ctx.row.original.costPerMinuteUsd} fmt={usd4} />
          <SourceBadge source={ctx.row.original.hasEstimatedCost ? "estimated" : "reported"} />
        </div>
      ),
    }),
    statColumn("cost", col.costPerRun, (a) => a.costUsd, usd4),
    statColumn("latency", col.latencyMean, (a) => a.latencyMeanMs, f.ms),
    statColumn("latencyP95", col.latencyP95, (a) => a.latencyP95Ms, f.ms),
    statColumn(
      "composite",
      col.complexityScore,
      (a) => a.compositeScore,
      (v) => f.num(v, 1),
    ),
    statColumn(
      "judge",
      col.judge,
      (a) => a.judgeMean,
      (v) => f.num(v, 2),
    ),
    statColumn(
      "words",
      col.wordsPerResp,
      (a) => a.avgWordsPerResponse,
      (v) => f.num(v, 1),
    ),
    statColumn(
      "readability",
      col.readability,
      (a) => a.readabilityGrade,
      (v) => f.num(v, 1),
    ),
    statColumn(
      "lexical",
      col.lexical,
      (a) => a.lexicalDiversity,
      (v) => f.num(v, 2),
    ),
  ] as SortableColumns<VariantAggregate>;
};

export function AggregateTable({ data }: { data: VariantAggregate[] }) {
  const t = useT();
  const f = useFormat();
  const columns = useMemo(() => buildColumns(t, f), [t, f]);
  return <SortableTable data={data} columns={columns} empty={t.results.noCompletedRuns} />;
}
