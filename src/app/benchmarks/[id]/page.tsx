import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { benchmarkProgress, getBenchmark } from "@/lib/services/benchmarks";
import { getBenchmarkResultRows } from "@/lib/services/results";
import { BenchmarkView } from "./benchmark-view";

export const dynamic = "force-dynamic";

export default async function BenchmarkPage({ params }: PageProps<"/benchmarks/[id]">) {
  const id = Number((await params).id);
  const db = getDb();
  const benchmark = Number.isInteger(id) ? getBenchmark(db, id) : null;
  if (!benchmark) notFound();
  return (
    <BenchmarkView
      benchmark={{
        id: benchmark.id,
        name: benchmark.name,
        status: benchmark.status,
        repetitions: benchmark.repetitions,
        judgeEnabled: benchmark.judgeEnabled,
        estimatedCostUsd: benchmark.estimatedCostUsd,
      }}
      progress={benchmarkProgress(db, id)}
      rows={getBenchmarkResultRows(db, id)}
    />
  );
}
