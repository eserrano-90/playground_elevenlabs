"use client";

import { useMemo } from "react";
import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import type { RunResultRow } from "@/lib/results";
import type { Formatters } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useFormat, useT } from "@/lib/i18n/client";
import { SourceBadge, StatusBadge } from "@/components/status-badge";
import { SortableTable, sortableFeatures, type SortableColumns } from "./sortable-table";

const helper = createColumnHelper<typeof sortableFeatures, RunResultRow>();
const num = (k: keyof RunResultRow) => (r: RunResultRow) => (r[k] as number | null) ?? undefined;

const buildColumns = ({ results: { col } }: Dictionary, f: Formatters) =>
  [
    helper.accessor("runId", {
      header: col.run,
      cell: (ctx) => (
        <Link href={`/runs/${ctx.getValue()}`} className="underline-offset-4 hover:underline">
          #{ctx.getValue()}
        </Link>
      ),
    }),
    helper.accessor("status", {
      header: col.status,
      cell: (ctx) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={ctx.getValue()} />
          {ctx.row.original.error ? (
            <span
              className="max-w-56 truncate text-xs text-destructive"
              title={ctx.row.original.error}
            >
              {ctx.row.original.error}
            </span>
          ) : null}
        </div>
      ),
    }),
    helper.accessor("variantName", { header: col.variant }),
    helper.accessor("scenarioName", { header: col.scenario }),
    helper.accessor("repetition", { header: col.rep }),
    helper.accessor(num("durationSecs"), {
      id: "duration",
      header: col.duration,
      sortUndefined: "last",
      cell: (ctx) => (
        <span className="inline-flex items-center gap-1">
          {f.secs(ctx.row.original.durationSecs)}
          <SourceBadge source={ctx.row.original.durationSource} />
        </span>
      ),
    }),
    helper.accessor(num("costPerMinuteUsd"), {
      id: "costPerMinute",
      header: col.costPerMin,
      sortUndefined: "last",
      cell: (ctx) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          {f.usd(ctx.row.original.costPerMinuteUsd)}
          <SourceBadge source={ctx.row.original.costSource} />
        </span>
      ),
    }),
    helper.accessor(num("costUsd"), {
      id: "cost",
      header: col.cost,
      sortUndefined: "last",
      cell: (ctx) => f.usd(ctx.row.original.costUsd),
    }),
    helper.accessor(num("latencyMeanMs"), {
      id: "latency",
      header: col.latency,
      sortUndefined: "last",
      cell: (ctx) => f.ms(ctx.row.original.latencyMeanMs),
    }),
    helper.accessor(num("compositeScore"), {
      id: "composite",
      header: col.complexity,
      sortUndefined: "last",
      cell: (ctx) => f.num(ctx.row.original.compositeScore),
    }),
    helper.accessor(num("agentTurns"), {
      id: "turns",
      header: col.agentTurns,
      sortUndefined: "last",
      cell: (ctx) => ctx.row.original.agentTurns ?? "—",
    }),
  ] as SortableColumns<RunResultRow>;

export function RunsTable({ data }: { data: RunResultRow[] }) {
  const t = useT();
  const f = useFormat();
  const columns = useMemo(() => buildColumns(t, f), [t, f]);
  return <SortableTable data={data} columns={columns} empty={t.results.noRuns} />;
}
