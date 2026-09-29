import { getDb } from "@/db/client";
import { getEnv, isJudgeConfigured } from "@/lib/env";
import { aggregateByVariant } from "@/lib/results";
import { listScenarios, listVariants } from "@/lib/services/config";
import { getLiveResultRows } from "@/lib/services/results";
import { AggregateTable } from "@/components/results/aggregate-table";
import { RunsTable } from "@/components/results/runs-table";
import { PageHeader } from "@/components/page-header";
import { getT } from "@/lib/i18n/server";
import { LiveSession } from "./live-session";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const t = (await getT()).live;
  const db = getDb();
  const rows = getLiveResultRows(db);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t.title}
        description={t.description}
      />
      <div data-tour="live-session">
        <LiveSession
          variants={listVariants(db).map((v) => ({ id: v.id, name: v.name }))}
          scenarios={listScenarios(db).map((s) => ({ id: s.id, name: s.name }))}
          judgeAvailable={isJudgeConfigured(getEnv())}
        />
      </div>
      <section className="flex flex-col gap-3" data-tour="live-results">
        <h2 className="text-lg font-semibold tracking-tight">{t.resultsByVariant}</h2>
        <AggregateTable data={aggregateByVariant(rows)} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t.runs}</h2>
        <RunsTable data={rows} />
      </section>
    </div>
  );
}
