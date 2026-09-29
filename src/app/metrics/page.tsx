import Link from "next/link";
import { BookOpenTextIcon, BrainCircuitIcon, CoinsIcon, SigmaIcon, TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Rich } from "@/components/rich";
import { COMPOSITE_RANGES, COMPOSITE_WEIGHTS } from "@/lib/analysis/composite";
import { JUDGE_CRITERIA } from "@/lib/analysis/judge";
import { MATTR_WINDOW } from "@/lib/analysis/metrics";
import { ESTIMATE_ASSUMPTIONS } from "@/lib/cost/cost";
import { getT } from "@/lib/i18n/server";

const pct = (w: number) => `${Math.round(w * 100)}%`;
const range = ([lo, hi]: readonly [number, number]) => `${lo} → ${hi}`;

const SECTIONS = [
  { id: "latency", icon: TimerIcon },
  { id: "cost", icon: CoinsIcon },
  { id: "complexity", icon: BookOpenTextIcon },
  { id: "judge", icon: BrainCircuitIcon },
  { id: "aggregation", icon: SigmaIcon },
] as const;

export default async function MetricsPage() {
  const { metrics: t, common } = await getT();
  const W = COMPOSITE_WEIGHTS;
  const R = COMPOSITE_RANGES;
  const composite = [
    {
      metric: t.complexity.rows.words,
      weight: W.avgWordsPerResponse,
      range: range(R.avgWordsPerResponse),
    },
    {
      metric: t.complexity.rows.sentence,
      weight: W.avgSentenceLength,
      range: range(R.avgSentenceLength),
    },
    {
      metric: t.complexity.rows.readability,
      weight: W.readability,
      range: t.complexity.readabilityRange(
        range(R.fleschKincaidGrade),
        range(R.fernandezHuertaEase),
        range(R.kandelMolesEase),
      ),
    },
    {
      metric: t.complexity.rows.lexical,
      weight: W.lexicalDiversity,
      range: range(R.lexicalDiversity),
    },
    { metric: t.complexity.rows.judge, weight: W.judge, range: range(R.judge) },
  ];
  const A = ESTIMATE_ASSUMPTIONS;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t.title} description={t.description} />

      <nav
        className="flex flex-wrap gap-2"
        aria-label={t.sectionsLabel}
        data-tour="metrics-sections"
      >
        {SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <s.icon className="size-4" />
            {t.sections[s.id]}
          </Link>
        ))}
      </nav>

      <Section
        id="latency"
        title={t.sections.latency}
        description={t.latency.description}
        data-tour="metrics-latency"
      >
        <Metric item={t.latency.turn} unit="ms" />
        <Metric item={t.latency.mean} unit="ms" />
        <Metric item={t.latency.p95} unit="ms" />
        <Note>{t.latency.note}</Note>
      </Section>

      <Section
        id="cost"
        title={t.sections.cost}
        description={t.cost.description}
        data-tour="metrics-cost"
      >
        <Metric item={t.cost.run} unit="USD" />
        <Metric item={t.cost.llm} unit="USD" />
        <Metric item={t.cost.perMin} unit="USD" />
        <Metric item={t.cost.perRun} unit="USD" />
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{common.estimated}</Badge>
          {t.cost.estimatedBadge}
        </div>
        <Note>
          {t.cost.note({
            agentChars: A.agentCharsPerTurn,
            userChars: A.userCharsPerTurn,
            outputTokens: A.outputTokensPerTurn,
          })}
        </Note>
      </Section>

      <Section
        id="complexity"
        title={t.sections.complexity}
        description={t.complexity.description}
        data-tour="metrics-complexity"
      >
        <Metric item={t.complexity.words} />
        <Metric item={t.complexity.sentence} />
        <Metric item={t.complexity.readability} />
        <Metric
          item={{ name: t.complexity.lexical.name, body: t.complexity.lexical.body(MATTR_WINDOW) }}
          unit="0–1"
        />
        <Metric item={t.complexity.score} unit="0–100" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.complexity.table.component}</TableHead>
              <TableHead className="text-right">{t.complexity.table.weight}</TableHead>
              <TableHead>{t.complexity.table.mapsTo}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {composite.map((c) => (
              <TableRow key={c.metric}>
                <TableCell>{c.metric}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(c.weight)}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{c.range}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Note>{t.complexity.note}</Note>
      </Section>

      <Section
        id="judge"
        title={t.sections.judge}
        description={<Rich text={t.judge.description} />}
        data-tour="metrics-judge"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.judge.criterion}</TableHead>
              <TableHead>{t.judge.scale}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {JUDGE_CRITERIA.map((c) => (
              <TableRow key={c}>
                <TableCell>{t.judge.criteria[c].name}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {t.judge.criteria[c].body}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Metric item={t.judge.mean} />
        <Note>{t.judge.note}</Note>
      </Section>

      <Section
        id="aggregation"
        title={t.sections.aggregation}
        description={t.aggregation.description}
        data-tour="metrics-aggregation"
      >
        <Metric item={t.aggregation.perVariant} />
        <Metric item={t.aggregation.spread} />
        <Metric item={t.aggregation.highlights} />
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
  ...props
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
} & React.ComponentProps<"div">) {
  return (
    <Card id={id} className="scroll-mt-20" {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function Metric({ item, unit }: { item: { name: string; body: string }; unit?: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[12rem_1fr] sm:gap-4">
      <div className="flex items-center gap-2 font-medium">
        {item.name}
        {unit ? <span className="text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </div>
      <p className="text-muted-foreground">
        <Rich text={item.body} />
      </p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{children}</p>;
}
