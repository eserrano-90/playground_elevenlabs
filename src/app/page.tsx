import Link from "next/link";
import { ArrowRightIcon, BarChart3Icon, BlocksIcon, CheckCircle2Icon, CircleIcon, PlusIcon, ScrollTextIcon } from "lucide-react";
import { getDb } from "@/db/client";
import { listBenchmarks } from "@/lib/services/benchmarks";
import { listScenarios, listVariants } from "@/lib/services/config";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getFormat, getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const t = (await getT()).benchmarks;
  const f = getFormat(locale);
  const db = getDb();
  const benchmarks = listBenchmarks(db);
  const variantCount = listVariants(db).length;
  const scenarioCount = listScenarios(db).length;
  const ready = variantCount > 0 && scenarioCount > 0;

  const steps = [
    {
      done: variantCount > 0,
      title: t.steps.variants.title,
      description: t.steps.variants.description,
      href: "/variants",
      icon: BlocksIcon,
      meta: t.variantsCreated(variantCount),
    },
    {
      done: scenarioCount > 0,
      title: t.steps.scenarios.title,
      description: t.steps.scenarios.description,
      href: "/scenarios",
      icon: ScrollTextIcon,
      meta: t.scenariosCreated(scenarioCount),
    },
    {
      done: benchmarks.length > 0,
      title: t.steps.benchmark.title,
      description: t.steps.benchmark.description,
      href: "/benchmarks/new",
      icon: BarChart3Icon,
      meta: ready ? t.ready : t.needsSetup,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Link href="/benchmarks/new" className={buttonVariants()} data-tour="new-benchmark">
            <PlusIcon data-icon="inline-start" />
            {t.newBenchmark}
          </Link>
        }
      />

      {benchmarks.length === 0 ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Link key={s.href} href={s.href} className="group">
                <Card className={cn("h-full transition-colors group-hover:bg-muted/50", s.done && "border-primary/30")}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t.step(i + 1)}</span>
                      {s.done ? (
                        <CheckCircle2Icon className="size-4 text-primary" />
                      ) : (
                        <CircleIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      <s.icon className="size-4" />
                      {s.title}
                    </CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{s.meta}</span>
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3Icon />
              </EmptyMedia>
              <EmptyTitle>{t.emptyTitle}</EmptyTitle>
              <EmptyDescription>
                {ready ? t.emptyReady : t.emptyNotReady}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={ready ? "/benchmarks/new" : variantCount === 0 ? "/variants" : "/scenarios"}
                className={buttonVariants()}
              >
                {ready ? t.newBenchmark : variantCount === 0 ? t.createVariant : t.writeScenario}
              </Link>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t.columns.name}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead className="w-56">{t.columns.progress}</TableHead>
                <TableHead className="text-right">{t.columns.estimatedCost}</TableHead>
                <TableHead className="pr-4 text-right">{t.columns.created}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map((b) => {
                const pct = b.progress.total ? Math.round((b.progress.done / b.progress.total) * 100) : 0;
                return (
                  <TableRow key={b.id} className="relative">
                    <TableCell className="pl-4">
                      <Link href={`/benchmarks/${b.id}`} className="font-medium after:absolute after:inset-0">
                        {b.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="w-28" />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {b.progress.done}/{b.progress.total}
                          {b.progress.failed ? <span className="ml-1.5 text-destructive">· {t.failedCount(b.progress.failed)}</span> : null}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.usd(b.estimatedCostUsd, 2)}</TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground">{f.date(b.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
