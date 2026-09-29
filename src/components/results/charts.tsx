"use client";

import { ChartScatterIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { VariantAggregate } from "@/lib/results";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/native-select";
import { useFormat, useT } from "@/lib/i18n/client";
import { colorAt } from "./palette";

const METRICS = {
  costPerMinuteUsd: { digits: 4 },
  costUsd: { digits: 4 },
  compositeScore: { digits: 1 },
  judgeMean: { digits: 2 },
  avgWordsPerResponse: { digits: 1 },
  readabilityGrade: { digits: 1 },
  lexicalDiversity: { digits: 3 },
  latencyMeanMs: { digits: 0 },
  latencyP95Ms: { digits: 0 },
} as const satisfies Partial<Record<keyof VariantAggregate, { digits: number }>>;
type MetricKey = keyof typeof METRICS;

const round = (v: number | null, digits: number) => (v == null ? null : Number(v.toFixed(digits)));

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; y: number } }[] }) {
  const t = useT();
  const f = useFormat();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow">
      <div className="font-medium">{p.name}</div>
      <div>
        {t.results.charts.costPerMin}: {f.usd(p.x, 4)}
      </div>
      <div>
        {t.results.charts.complexity}: {f.num(p.y, 1)}
      </div>
    </div>
  );
}

export function ResultsCharts({ data }: { data: VariantAggregate[] }) {
  const [metric, setMetric] = useState<MetricKey>("costPerMinuteUsd");
  const t = useT();
  const c = t.results.charts;
  const labels = t.results.metrics;

  if (data.length === 0)
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartScatterIcon />
          </EmptyMedia>
          <EmptyTitle>{c.emptyTitle}</EmptyTitle>
          <EmptyDescription>{c.emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const scatter = data
    .map((a, i) => ({
      name: a.variantName,
      x: round(a.costPerMinuteUsd.mean, 4),
      y: round(a.compositeScore.mean, 1),
      color: colorAt(i),
    }))
    .filter((p) => p.x != null && p.y != null);
  const latency = data.map((a) => ({
    name: a.variantName,
    mean: round(a.latencyMeanMs.mean, 0),
    p95: round(a.latencyP95Ms.mean, 0),
  }));
  const bars = data.map((a, i) => ({
    name: a.variantName,
    value: round(a[metric].mean, METRICS[metric].digits),
    color: colorAt(i),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{c.scatterTitle}</CardTitle>
          <CardDescription>{c.scatterDescription}</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name={c.costPerMin} unit=" $" label={{ value: labels.costPerMinuteUsd, position: "bottom" }} />
              <YAxis type="number" dataKey="y" name={c.complexity} domain={[0, 100]} label={{ value: c.complexity, angle: -90, position: "insideLeft" }} />
              <ZAxis range={[120, 120]} />
              <Tooltip content={<ScatterTooltip />} />
              <Legend verticalAlign="top" />
              {scatter.map((p) => (
                <Scatter key={p.name} name={p.name} data={[p]} fill={p.color} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{c.latencyTitle}</CardTitle>
          <CardDescription>{c.latencyDescription}</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit=" ms" />
              <Tooltip />
              <Legend />
              <Bar dataKey="mean" name={c.mean} fill={colorAt(0)} />
              <Bar dataKey="p95" name="p95" fill={colorAt(3)} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{c.metricTitle}</CardTitle>
          <NativeSelect className="w-56" aria-label={c.metricLabel} value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </NativeSelect>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name={labels[metric]}>
                {bars.map((b) => (
                  <Cell key={b.name} fill={b.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
