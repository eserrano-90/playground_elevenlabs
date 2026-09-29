"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlocksIcon, PlusIcon, RocketIcon, ScrollTextIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ErrorBanner, Field } from "@/components/field";
import { PageHeader } from "@/components/page-header";
import { ApiError, api } from "@/lib/fetcher";
import { incompatiblePairs } from "@/lib/elevenlabs/tts-compat";
import { useFormat, useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface Option {
  id: number;
  name: string;
  detail: string;
}

interface VariantOption extends Option {
  ttsModel: string;
}

interface ScenarioOption extends Option {
  language: string;
}

interface Estimate {
  estimatedCostUsd: number;
  runCount: number;
  maxRuns: number;
  assumptions: Record<string, number>;
}

function MultiPick({
  title,
  icon: Icon,
  options,
  selected,
  onChange,
  error,
  emptyHref,
  emptyTitle,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType;
  options: Option[];
  selected: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  emptyHref: string;
  emptyTitle: string;
  emptyLabel: string;
}) {
  const t = useT().newBenchmark;
  const allSelected = options.length > 0 && selected.length === options.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className={error ? "text-destructive" : undefined}>
          {error ?? t.selectedCount(selected.length, options.length)}
        </CardDescription>
        {options.length > 0 ? (
          <CardAction>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(allSelected ? [] : options.map((o) => o.id))}>
              {allSelected ? t.clear : t.selectAll}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <Empty className="border border-dashed p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon />
              </EmptyMedia>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{t.emptyDescription}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href={emptyHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <PlusIcon data-icon="inline-start" />
                {emptyLabel}
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {options.map((o) => (
              <Label
                key={o.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-muted/50 has-data-checked:border-primary/50 has-data-checked:bg-primary/5"
              >
                <Checkbox
                  checked={selected.includes(o.id)}
                  onCheckedChange={(c) => onChange(c ? [...selected, o.id] : selected.filter((x) => x !== o.id))}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{o.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{o.detail}</span>
                </span>
              </Label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NewBenchmarkForm({
  variants,
  scenarios,
  maxRuns,
  judgeAvailable,
}: {
  variants: VariantOption[];
  scenarios: ScenarioOption[];
  maxRuns: number;
  judgeAvailable: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const tAll = useT();
  const t = tAll.newBenchmark;
  const f = useFormat();
  const [name, setName] = useState(() =>
    t.defaultName(new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { dateStyle: "medium" }).format(new Date())),
  );
  const [variantIds, setVariantIds] = useState<number[]>([]);
  const [scenarioIds, setScenarioIds] = useState<number[]>([]);
  const [repetitions, setRepetitions] = useState("1");
  const [judgeEnabled, setJudgeEnabled] = useState(judgeAvailable);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);

  const reps = Number(repetitions) || 0;
  const runCount = variantIds.length * scenarioIds.length * reps;
  const overCap = runCount > maxRuns;
  const body = { name, variantIds, scenarioIds, repetitions, judgeEnabled };
  const mismatches = useMemo(
    () =>
      incompatiblePairs(
        variants.filter((v) => variantIds.includes(v.id)),
        scenarios.filter((s) => scenarioIds.includes(s.id)),
      ),
    [variants, scenarios, variantIds, scenarioIds],
  );
  const languageName = (code: string) => (tAll.languages as Record<string, string>)[code] ?? code.toUpperCase();

  async function review(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner(null);
    setBusy(true);
    try {
      setEstimate(await api<Estimate>("/api/benchmarks/estimate", { method: "POST", json: body }));
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setBanner((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndStart() {
    setBusy(true);
    try {
      const { benchmark } = await api<{ benchmark: { id: number } }>("/api/benchmarks", { method: "POST", json: body });
      await api(`/api/benchmarks/${benchmark.id}/start`, { method: "POST" });
      router.push(`/benchmarks/${benchmark.id}`);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setBanner((err as Error).message);
      setEstimate(null);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={review} className="flex flex-col gap-6" noValidate>
      <PageHeader
        eyebrow={
          <Link href="/" className="hover:text-foreground">
            {t.breadcrumb}
          </Link>
        }
        title={t.title}
        description={t.description}
      />
      <ErrorBanner message={banner} />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Field label={t.name} htmlFor="name" error={errors.name}>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2" data-tour="benchmark-picks">
            <MultiPick
              title={t.variants}
              icon={BlocksIcon}
              options={variants}
              selected={variantIds}
              onChange={setVariantIds}
              error={errors.variantIds}
              emptyHref="/variants"
              emptyTitle={t.noVariants}
              emptyLabel={t.createVariant}
            />
            <MultiPick
              title={t.scenarios}
              icon={ScrollTextIcon}
              options={scenarios}
              selected={scenarioIds}
              onChange={setScenarioIds}
              error={errors.scenarioIds}
              emptyHref="/scenarios"
              emptyTitle={t.noScenarios}
              emptyLabel={t.writeScenario}
            />
          </div>
        </div>

        <Card className="lg:sticky lg:top-20" data-tour="benchmark-summary">
          <CardHeader>
            <CardTitle>{t.summary}</CardTitle>
            <CardDescription>{t.summaryDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label={t.repetitions} htmlFor="repetitions" error={errors.repetitions} hint={t.repetitionsHint}>
              <Input
                id="repetitions"
                type="number"
                min={1}
                max={10}
                className="tabular-nums"
                value={repetitions}
                onChange={(e) => setRepetitions(e.target.value)}
                aria-invalid={!!errors.repetitions}
              />
            </Field>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="judge">{t.judge}</Label>
                <p className="text-xs text-muted-foreground">
                  {judgeAvailable ? t.judgeAvailable : t.judgeUnavailable}
                </p>
              </div>
              <Switch id="judge" checked={judgeEnabled} disabled={!judgeAvailable} onCheckedChange={setJudgeEnabled} />
            </div>
            <Separator />
            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">{t.variants}</dt>
              <dd className="text-right tabular-nums">{variantIds.length}</dd>
              <dt className="text-muted-foreground">{t.timesScenarios}</dt>
              <dd className="text-right tabular-nums">{scenarioIds.length}</dd>
              <dt className="text-muted-foreground">{t.timesRepetitions}</dt>
              <dd className="text-right tabular-nums">{reps}</dd>
              <dt className="font-medium">{t.runs}</dt>
              <dd className={cn("text-right font-medium tabular-nums", overCap && "text-destructive")}>{runCount}</dd>
            </dl>
            <div className="flex flex-col gap-1.5">
              <Progress value={Math.min(100, (runCount / maxRuns) * 100)} aria-label={t.runsCapLabel} />
              <p className="text-xs text-muted-foreground tabular-nums">
                {t.runsOfMax(runCount, maxRuns)}
              </p>
            </div>
            {overCap ? (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{t.tooManyRuns}</AlertDescription>
              </Alert>
            ) : null}
            {mismatches.length ? (
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>{t.compatTitle}</AlertTitle>
                <AlertDescription>
                  <p>{t.compatDescription}</p>
                  <ul className="list-disc pl-4">
                    {mismatches.map(({ variant, scenario }) => (
                      <li key={`${variant.id}-${scenario.id}`}>
                        {variant.name} ({variant.ttsModel}) × {scenario.name} ({languageName(scenario.language)})
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="border-t">
            <Button type="submit" className="w-full" disabled={busy || runCount === 0 || overCap}>
              {busy && !estimate ? <Spinner data-icon="inline-start" /> : null}
              {t.reviewEstimate}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={estimate != null} onOpenChange={(open) => !open && !busy && setEstimate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.startTitle}</DialogTitle>
            <DialogDescription>{t.startDescription}</DialogDescription>
          </DialogHeader>
          {estimate ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">{t.runs}</span>
                  <span className="text-2xl font-semibold tabular-nums">{estimate.runCount}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">{t.estimatedMax}</span>
                  <span className="text-2xl font-semibold tabular-nums">{f.usd(estimate.estimatedCostUsd, 2)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.assumptions(estimate.assumptions.agentCharsPerTurn, estimate.assumptions.outputTokensPerTurn)}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEstimate(null)} disabled={busy}>
              {tAll.common.back}
            </Button>
            <Button type="button" onClick={confirmAndStart} disabled={busy}>
              {busy ? <Spinner data-icon="inline-start" /> : <RocketIcon data-icon="inline-start" />}
              {t.confirmStart}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
