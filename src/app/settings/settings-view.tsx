"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmButton } from "@/components/confirm-button";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/fetcher";
import { useFormat, useT } from "@/lib/i18n/client";

interface Pricing {
  usdPerCredit: number;
  plan: string;
  agentUsdPerMinuteByPlan: Record<string, number>;
  speechRateByTtsModel: Record<string, number>;
  updatedAt: string | null;
}
interface Llm {
  id: string;
  label: string;
  provider: string;
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  updatedAt: string | null;
}

type Pairs = { key: string; value: string }[];
const toPairs = (r: Record<string, number>): Pairs => Object.entries(r).map(([key, v]) => ({ key, value: String(v) }));
const fromPairs = (p: Pairs) => Object.fromEntries(p.filter((x) => x.key.trim()).map((x) => [x.key.trim(), Number(x.value)]));

function PairsEditor({ pairs, onChange, keyLabel, valueLabel }: { pairs: Pairs; onChange: (p: Pairs) => void; keyLabel: string; valueLabel: string }) {
  const t = useT();
  const update = (i: number, patch: Partial<Pairs[number]>) => onChange(pairs.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_110px_32px] gap-2 text-xs text-muted-foreground">
        <span>{keyLabel}</span>
        <span>{valueLabel}</span>
      </div>
      {pairs.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_110px_32px] gap-2">
          <Input value={p.key} aria-label={keyLabel} className="font-mono text-xs" onChange={(e) => update(i, { key: e.target.value })} />
          <Input type="number" step="any" aria-label={valueLabel} className="tabular-nums" value={p.value} onChange={(e) => update(i, { value: e.target.value })} />
          <Button type="button" size="icon" variant="ghost" aria-label={t.settings.removeRow(p.key)} onClick={() => onChange(pairs.filter((_, j) => j !== i))}>
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => onChange([...pairs, { key: "", value: "" }])}>
        <PlusIcon data-icon="inline-start" /> {t.settings.add}
      </Button>
    </div>
  );
}

const EMPTY_LLM = { id: "", label: "", provider: "", inputUsdPerMTok: "", outputUsdPerMTok: "" };
type LlmForm = typeof EMPTY_LLM;

export function SettingsView({ pricing, llms }: { pricing: Pricing; llms: Llm[] }) {
  const router = useRouter();
  const t = useT();
  const f = useFormat();
  const [usdPerCredit, setUsdPerCredit] = useState(String(pricing.usdPerCredit));
  const [plan, setPlan] = useState(pricing.plan);
  const [planRates, setPlanRates] = useState(toPairs(pricing.agentUsdPerMinuteByPlan));
  const [speechRates, setSpeechRates] = useState(toPairs(pricing.speechRateByTtsModel));
  const [llmForm, setLlmForm] = useState<LlmForm | null>(null);
  const [editingExisting, setEditingExisting] = useState(false);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const providers = useMemo(() => [...new Set(llms.map((l) => l.provider))].sort(), [llms]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return llms.filter(
      (l) => (provider === "all" || l.provider === provider) && (!q || l.id.toLowerCase().includes(q) || l.label.toLowerCase().includes(q)),
    );
  }, [llms, query, provider]);

  async function run<T>(key: string, fn: () => Promise<T>, success: string | ((result: T) => string)) {
    setBusy(key);
    try {
      const result = await fn();
      toast.success(typeof success === "function" ? success(result) : success);
      router.refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const savePricing = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      "pricing",
      () =>
        api("/api/settings/pricing", {
          method: "PUT",
          json: { usdPerCredit, plan, agentUsdPerMinuteByPlan: fromPairs(planRates), speechRateByTtsModel: fromPairs(speechRates) },
        }),
      t.settings.pricing.saved,
    );
  };

  const saveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!llmForm) return;
    const ok = await run("llm", () => api("/api/settings/llms", { method: "POST", json: llmForm }), t.settings.llms.saved(llmForm.id));
    if (ok) setLlmForm(null);
  };

  const cleanup = () =>
    run(
      "cleanup",
      async () => {
        const r = await api<{ deleted: number; failed: string[] }>("/api/elevenlabs/cleanup", { method: "POST" });
        if (r.failed.length) throw new Error(t.settings.agents.partialFailure(r.deleted, r.failed.join(", ")));
        return r;
      },
      (r) => t.settings.agents.deleted(r.deleted),
    );

  const openLlm = (l?: Llm) => {
    setEditingExisting(!!l);
    setLlmForm(l ? { ...l, inputUsdPerMTok: String(l.inputUsdPerMTok), outputUsdPerMTok: String(l.outputUsdPerMTok) } : EMPTY_LLM);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.settings.title}
        description={t.settings.description(f.date(pricing.updatedAt))}
      />

      <Tabs defaultValue="pricing" className="gap-4">
        <TabsList>
          <TabsTrigger value="pricing" data-tour="settings-pricing">{t.settings.tabs.pricing}</TabsTrigger>
          <TabsTrigger value="llms" data-tour="settings-llms">
            {t.settings.tabs.llms} <Badge variant="secondary">{llms.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="maintenance" data-tour="settings-agents">{t.settings.tabs.maintenance}</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <form onSubmit={savePricing}>
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.pricing.title}</CardTitle>
                <CardDescription>{t.settings.pricing.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8 lg:grid-cols-3">
                <div className="flex flex-col gap-4">
                  <Field label={t.settings.pricing.usdPerCredit} htmlFor="usdPerCredit" hint={t.settings.pricing.usdPerCreditHint}>
                    <Input id="usdPerCredit" type="number" step="any" className="tabular-nums" value={usdPerCredit} onChange={(e) => setUsdPerCredit(e.target.value)} />
                  </Field>
                  <Field label={t.settings.pricing.plan} htmlFor="plan" hint={t.settings.pricing.planHint}>
                    <NativeSelect id="plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
                      {planRates
                        .map((p) => p.key)
                        .filter(Boolean)
                        .map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field label={t.settings.pricing.planRates}>
                  <PairsEditor pairs={planRates} onChange={setPlanRates} keyLabel={t.settings.pricing.planKey} valueLabel="USD / min" />
                </Field>
                <Field label={t.settings.pricing.speechRates} hint={t.settings.pricing.speechRatesHint}>
                  <PairsEditor pairs={speechRates} onChange={setSpeechRates} keyLabel={t.settings.pricing.ttsModel} valueLabel={t.settings.pricing.charsPerSec} />
                </Field>
              </CardContent>
              <CardFooter className="justify-end border-t">
                <Button type="submit" disabled={busy === "pricing"}>
                  {busy === "pricing" ? <Spinner data-icon="inline-start" /> : null}
                  {t.settings.pricing.save}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="llms">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.llms.title}</CardTitle>
              <CardDescription>{t.settings.llms.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <InputGroup className="md:max-w-xs">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput placeholder={t.settings.llms.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.settings.llms.searchAria} />
                </InputGroup>
                <div className="flex flex-wrap items-center gap-2">
                  <ToggleGroup
                    variant="outline"
                    size="sm"
                    value={[provider]}
                    onValueChange={(v: string[]) => setProvider(v[0] ?? "all")}
                    aria-label={t.settings.llms.filterAria}
                    className="flex-wrap"
                  >
                    <ToggleGroupItem value="all">{t.common.all}</ToggleGroupItem>
                    {providers.map((p) => (
                      <ToggleGroupItem key={p} value={p}>
                        {p}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <Button size="sm" onClick={() => openLlm()}>
                    <PlusIcon data-icon="inline-start" /> {t.settings.llms.add}
                  </Button>
                </div>
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="pl-4">{t.settings.llms.model}</TableHead>
                      <TableHead>{t.settings.llms.provider}</TableHead>
                      <TableHead className="text-right">{t.settings.llms.input}</TableHead>
                      <TableHead className="text-right">{t.settings.llms.output}</TableHead>
                      <TableHead>{t.settings.llms.updated}</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          {t.settings.llms.noMatch}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="pl-4">
                            <div className="font-medium">{l.label}</div>
                            <div className="font-mono text-xs text-muted-foreground">{l.id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{l.provider}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{l.inputUsdPerMTok}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.outputUsdPerMTok}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.date(l.updatedAt)}</TableCell>
                          <TableCell className="pr-2 text-right">
                            <Button size="icon-sm" variant="ghost" aria-label={t.settings.llms.editAria(l.id)} onClick={() => openLlm(l)}>
                              <PencilIcon />
                            </Button>
                            <ConfirmButton
                              size="icon-sm"
                              variant="ghost"
                              aria-label={t.settings.llms.deleteAria(l.id)}
                              title={t.settings.llms.deleteTitle(l.label)}
                              description={t.settings.llms.deleteDescription}
                              confirmLabel={t.common.delete}
                              onConfirm={() => run("delete", () => api(`/api/settings/llms/${encodeURIComponent(l.id)}`, { method: "DELETE" }), t.settings.llms.deleted(l.id))}
                            >
                              <Trash2Icon />
                            </ConfirmButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.settings.llms.showing(filtered.length, llms.length)}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.agents.title}</CardTitle>
              <CardDescription>
                {t.settings.agents.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t">
              <ConfirmButton
                variant="destructive"
                disabled={busy === "cleanup"}
                title={t.settings.agents.confirmTitle}
                description={t.settings.agents.confirmDescription}
                confirmLabel={t.settings.agents.confirmLabel}
                onConfirm={cleanup}
              >
                {busy === "cleanup" ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
                {t.settings.agents.cleanup}
              </ConfirmButton>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={llmForm !== null} onOpenChange={(o) => !o && setLlmForm(null)}>
        <DialogContent>
          <form onSubmit={saveLlm} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editingExisting ? t.settings.llms.edit : t.settings.llms.add}</DialogTitle>
              <DialogDescription>{t.settings.llms.dialogDescription}</DialogDescription>
            </DialogHeader>
            {llmForm ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(EMPTY_LLM) as (keyof LlmForm)[]).map((k) => (
                  <Field key={k} label={t.settings.llms.fields[k]} htmlFor={`llm-${k}`} className={k === "id" || k === "label" ? "sm:col-span-2" : undefined}>
                    <Input
                      id={`llm-${k}`}
                      type={k.endsWith("MTok") ? "number" : "text"}
                      step="any"
                      required
                      readOnly={k === "id" && editingExisting}
                      className={k === "id" ? "font-mono" : undefined}
                      value={llmForm[k]}
                      onChange={(e) => setLlmForm((f) => (f ? { ...f, [k]: e.target.value } : f))}
                    />
                  </Field>
                ))}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLlmForm(null)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={busy === "llm"}>
                {busy === "llm" ? <Spinner data-icon="inline-start" /> : null}
                {t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
