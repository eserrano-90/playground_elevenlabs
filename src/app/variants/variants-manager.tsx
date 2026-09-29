"use client";

import { useEffect, useState } from "react";
import {
  AudioLinesIcon,
  BlocksIcon,
  BrainIcon,
  ChevronDownIcon,
  CopyIcon,
  MicIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import type { Variant } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmButton } from "@/components/confirm-button";
import { ErrorBanner, Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { ApiError, api } from "@/lib/fetcher";
import { useT } from "@/lib/i18n/client";

interface Voice {
  voiceId: string;
  name: string;
  category: string | null;
  previewUrl: string | null;
}
interface TtsModel {
  modelId: string;
  name: string;
}

type Form = Record<
  "name" | "llm" | "ttsModel" | "voiceId" | "voiceName" | "temperature" | "maxTokens" | "stability" | "similarityBoost" | "speed",
  string
>;

const EMPTY: Form = {
  name: "",
  llm: "",
  ttsModel: "",
  voiceId: "",
  voiceName: "",
  temperature: "",
  maxTokens: "",
  stability: "",
  similarityBoost: "",
  speed: "",
};

const toForm = (v: Variant): Form => ({
  name: v.name,
  llm: v.llm,
  ttsModel: v.ttsModel,
  voiceId: v.voiceId,
  voiceName: v.voiceName ?? "",
  temperature: v.temperature?.toString() ?? "",
  maxTokens: v.maxTokens?.toString() ?? "",
  stability: v.stability?.toString() ?? "",
  similarityBoost: v.similarityBoost?.toString() ?? "",
  speed: v.speed?.toString() ?? "",
});

const ADVANCED = [
  { key: "temperature", step: "0.1", min: 0, max: 2 },
  { key: "maxTokens", step: "1", min: 1, max: undefined },
  { key: "stability", step: "0.05", min: 0, max: 1 },
  { key: "similarityBoost", step: "0.05", min: 0, max: 1 },
  { key: "speed", step: "0.05", min: 0.7, max: 1.2 },
] as const;

/** Loads an option list from the API; on failure the form falls back to manual entry. */
function useOptions<T>(url: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<T[]>(url)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [url]);
  return { data, error };
}

export function VariantsManager({
  initialVariants,
  llms,
  fallbackTtsModels,
}: {
  initialVariants: Variant[];
  llms: { id: string; label: string }[];
  fallbackTtsModels: string[];
}) {
  const t = useT();
  const [variants, setVariants] = useState(initialVariants);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState({ llm: false, tts: false, voice: false });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const voices = useOptions<Voice>("/api/elevenlabs/voices");
  const models = useOptions<TtsModel>("/api/elevenlabs/models");
  const ttsOptions = models.data?.length ? models.data : fallbackTtsModels.map((m) => ({ modelId: m, name: m }));
  const voiceManual = manual.voice || !!voices.error;
  const selectedVoice = voices.data?.find((v) => v.voiceId === form.voiceId);
  const llmLabel = (id: string) => llms.find((l) => l.id === id)?.label ?? id;
  const ttsLabel = (id: string) => ttsOptions.find((m) => m.modelId === id)?.name ?? id;
  const advancedSet = ADVANCED.filter((a) => form[a.key] !== "").length;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setBanner(null);
  }

  function edit(v: Variant) {
    setEditingId(v.id);
    setForm(toForm(v));
    setErrors({});
    setBanner(null);
    setAdvancedOpen(ADVANCED.some((a) => v[a.key] != null));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refresh() {
    setVariants(await api<Variant[]>("/api/variants"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setBanner(null);
    try {
      const body = { ...form, voiceName: form.voiceName || selectedVoice?.name || null };
      if (editingId) await api(`/api/variants/${editingId}`, { method: "PUT", json: body });
      else await api("/api/variants", { method: "POST", json: body });
      toast.success(editingId ? t.variants.saved(form.name) : t.variants.created(form.name));
      reset();
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setBanner((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function action(fn: () => Promise<unknown>, success: string) {
    try {
      await fn();
      toast.success(success);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const toggle = (k: keyof typeof manual) => (
    <Button type="button" variant="link" size="xs" className="h-auto p-0 text-muted-foreground" onClick={() => setManual((m) => ({ ...m, [k]: !m[k] }))}>
      {manual[k] ? t.variants.chooseFromList : t.variants.enterManually}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.variants.title}
        description={t.variants.description}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
        <form onSubmit={submit} noValidate className="lg:sticky lg:top-20" data-tour="variant-form">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? t.variants.editTitle : t.variants.newTitle}</CardTitle>
              <CardDescription>{editingId ? t.variants.editDescription : t.variants.newDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ErrorBanner message={banner} />
              <Field label={t.variants.name} htmlFor="name" error={errors.name}>
                <Input id="name" value={form.name} onChange={set("name")} placeholder={t.variants.namePlaceholder} aria-invalid={!!errors.name} />
              </Field>

              <Field label={t.variants.llm} htmlFor="llm" error={errors.llm} hint={toggle("llm")}>
                {manual.llm ? (
                  <Input id="llm" value={form.llm} onChange={set("llm")} placeholder={t.variants.llmPlaceholder} className="font-mono" aria-invalid={!!errors.llm} />
                ) : (
                  <NativeSelect id="llm" value={form.llm} onChange={set("llm")} aria-invalid={!!errors.llm}>
                    <option value="">{t.variants.selectLlm}</option>
                    {llms.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>

              <Field
                label={t.variants.ttsModel}
                htmlFor="ttsModel"
                error={errors.ttsModel ?? (models.error ? t.variants.modelsError(models.error) : undefined)}
                hint={toggle("tts")}
              >
                {manual.tts ? (
                  <Input id="ttsModel" value={form.ttsModel} onChange={set("ttsModel")} className="font-mono" aria-invalid={!!errors.ttsModel} />
                ) : (
                  <NativeSelect id="ttsModel" value={form.ttsModel} onChange={set("ttsModel")} aria-invalid={!!errors.ttsModel}>
                    <option value="">{t.variants.selectTtsModel}</option>
                    {ttsOptions.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>

              <Field
                label={t.variants.voice}
                htmlFor="voiceId"
                error={errors.voiceId ?? (voices.error ? t.variants.voicesError(voices.error) : undefined)}
                hint={voices.error ? undefined : toggle("voice")}
              >
                {voiceManual ? (
                  <div className="flex gap-2">
                    <Input id="voiceId" value={form.voiceId} onChange={set("voiceId")} placeholder={t.variants.voiceId} className="font-mono" aria-invalid={!!errors.voiceId} />
                    <Input value={form.voiceName} onChange={set("voiceName")} placeholder={t.variants.voiceLabelPlaceholder} aria-label={t.variants.voiceLabel} />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <NativeSelect
                      id="voiceId"
                      value={form.voiceId}
                      onChange={(e) => setForm((f) => ({ ...f, voiceId: e.target.value, voiceName: "" }))}
                      aria-invalid={!!errors.voiceId}
                      disabled={!voices.data}
                    >
                      <option value="">{voices.data ? t.variants.selectVoice : t.variants.loadingVoices}</option>
                      {voices.data?.map((v) => (
                        <option key={v.voiceId} value={v.voiceId}>
                          {v.name}
                          {v.category ? ` (${v.category})` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t.variants.previewVoice}
                            disabled={!selectedVoice?.previewUrl}
                            onClick={() => selectedVoice?.previewUrl && void new Audio(selectedVoice.previewUrl).play()}
                          />
                        }
                      >
                        <PlayIcon />
                      </TooltipTrigger>
                      <TooltipContent>{t.variants.previewVoice}</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </Field>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="rounded-lg border" data-tour="variant-advanced">
                <CollapsibleTrigger
                  render={<Button type="button" variant="ghost" className="w-full justify-between rounded-lg" />}
                >
                  <span className="flex items-center gap-2">
                    {t.variants.advanced}
                    {advancedSet ? <Badge variant="secondary">{t.variants.advancedSet(advancedSet)}</Badge> : null}
                  </span>
                  <ChevronDownIcon data-icon="inline-end" className={advancedOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-3 border-t p-3">
                    {ADVANCED.map((a) => (
                      <Field key={a.key} label={t.variants[a.key]} htmlFor={a.key} error={errors[a.key]}>
                        <Input
                          id={a.key}
                          type="number"
                          step={a.step}
                          min={a.min}
                          max={a.max}
                          value={form[a.key]}
                          onChange={set(a.key)}
                          placeholder={t.variants.defaultPlaceholder}
                          className="tabular-nums"
                          aria-invalid={!!errors[a.key]}
                        />
                      </Field>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              {editingId ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  {t.common.cancel}
                </Button>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {editingId ? t.variants.saveChanges : t.variants.createVariant}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {variants.length === 0 ? (
          <Empty className="border border-dashed" data-tour="variant-list">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BlocksIcon />
              </EmptyMedia>
              <EmptyTitle>{t.variants.emptyTitle}</EmptyTitle>
              <EmptyDescription>{t.variants.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2" data-tour="variant-list">
            {variants.map((v) => (
              <Card key={v.id} size="sm" className={editingId === v.id ? "ring-2 ring-primary" : undefined}>
                <CardHeader>
                  <CardTitle className="truncate">{v.name}</CardTitle>
                  <CardAction className="flex gap-0.5">
                    <Button size="icon-sm" variant="ghost" aria-label={t.variants.editAria(v.name)} onClick={() => edit(v)}>
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t.variants.duplicateAria(v.name)}
                      onClick={() => action(() => api(`/api/variants/${v.id}/duplicate`, { method: "POST" }), t.variants.duplicated(v.name))}
                    >
                      <CopyIcon />
                    </Button>
                    <ConfirmButton
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t.variants.deleteAria(v.name)}
                      title={t.variants.deleteTitle(v.name)}
                      description={t.variants.deleteDescription}
                      confirmLabel={t.common.delete}
                      onConfirm={() =>
                        action(async () => {
                          await api(`/api/variants/${v.id}`, { method: "DELETE" });
                          if (editingId === v.id) reset();
                        }, t.variants.deleted(v.name))
                      }
                    >
                      <Trash2Icon />
                    </ConfirmButton>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <SpecRow icon={BrainIcon} label={t.variants.llm} value={llmLabel(v.llm)} />
                  <SpecRow icon={AudioLinesIcon} label="TTS" value={ttsLabel(v.ttsModel)} />
                  <SpecRow icon={MicIcon} label={t.variants.voice} value={v.voiceName ?? v.voiceId} />
                  {ADVANCED.some((a) => v[a.key] != null) ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ADVANCED.filter((a) => v[a.key] != null).map((a) => (
                        <Badge key={a.key} variant="outline" className="tabular-nums">
                          {t.variants[a.key].toLowerCase()} {v[a.key]}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SpecRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
