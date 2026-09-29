"use client";

import { useState } from "react";
import {
  BotIcon,
  ChevronDownIcon,
  HeadsetIcon,
  LayoutTemplateIcon,
  ListOrderedIcon,
  MessageSquareQuoteIcon,
  PencilIcon,
  PlusIcon,
  ScrollTextIcon,
  SparklesIcon,
  StethoscopeIcon,
  Trash2Icon,
  UserRoundIcon,
  UtensilsIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Scenario } from "@/db/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmButton } from "@/components/confirm-button";
import { ErrorBanner, Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { Rich } from "@/components/rich";
import { ApiError, api } from "@/lib/fetcher";
import { useLocale, useT } from "@/lib/i18n/client";
import { TEMPLATE_LANGUAGES, type ScenarioTemplate, type TemplateIcon, type TemplateLanguage } from "@/lib/scenarios/templates";
import { SCENARIO_LANGUAGES, type ScenarioLanguage } from "@/lib/validation";
import { GenerateDialog, type ScenarioDraft } from "./generate-dialog";

interface Form {
  name: string;
  systemPrompt: string;
  firstMessage: string;
  language: string;
  userMode: "persona" | "scripted";
  personaPrompt: string;
  scriptedTurns: string[];
  maxTurns: string;
}

const emptyForm = (language: ScenarioLanguage): Form => ({
  name: "",
  systemPrompt: "",
  firstMessage: "",
  language,
  userMode: "scripted",
  personaPrompt: "",
  scriptedTurns: [""],
  maxTurns: "10",
});

const isScenarioLanguage = (l: string): l is ScenarioLanguage => (SCENARIO_LANGUAGES as readonly string[]).includes(l);

const TEMPLATE_ICONS: Record<TemplateIcon, LucideIcon> = {
  headset: HeadsetIcon,
  utensils: UtensilsIcon,
  stethoscope: StethoscopeIcon,
};

const templateToForm = (t: ScenarioTemplate["variants"][TemplateLanguage]): Form => ({
  name: t.name,
  systemPrompt: t.systemPrompt,
  firstMessage: t.firstMessage,
  language: t.language,
  userMode: t.userMode,
  personaPrompt: t.personaPrompt ?? "",
  scriptedTurns: t.scriptedTurns?.length ? [...t.scriptedTurns] : [""],
  maxTurns: String(t.maxTurns),
});

type Target = "name" | "systemPrompt" | "firstMessage" | "personaPrompt" | "scriptedTurns";

/** True when any of the given fields already has user content that applying would replace. */
const hasContent = (f: Form, fields: Target[]) =>
  fields.some((k) => (k === "scriptedTurns" ? f.scriptedTurns.some((t) => t.trim()) : f[k].trim() !== ""));

const toForm = (s: Scenario): Form => ({
  name: s.name,
  systemPrompt: s.systemPrompt,
  firstMessage: s.firstMessage,
  language: s.language,
  userMode: s.userMode,
  personaPrompt: s.personaPrompt ?? "",
  scriptedTurns: s.scriptedTurns?.length ? s.scriptedTurns : [""],
  maxTurns: String(s.maxTurns),
});

export function ScenariosManager({
  initialScenarios,
  templates,
  assist,
}: {
  initialScenarios: Scenario[];
  templates: ScenarioTemplate[];
  /** `model` is null when AI generation is not configured; `missing` lists the env vars to set. */
  assist: { model: string | null; missing: string[] };
}) {
  const t = useT();
  const locale = useLocale();
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [form, setForm] = useState<Form>(() => emptyForm(locale));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateLang, setTemplateLang] = useState<TemplateLanguage>("en");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [pending, setPending] = useState<{ title: string; apply: () => void } | null>(null);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setTurn = (i: number, value: string) =>
    setForm((f) => ({ ...f, scriptedTurns: f.scriptedTurns.map((turn, j) => (j === i ? value : turn)) }));

  async function refresh() {
    setScenarios(await api<Scenario[]>("/api/scenarios"));
  }

  function reset() {
    setForm(emptyForm(locale));
    setEditingId(null);
    setErrors({});
    setBanner(null);
  }

  function edit(s: Scenario) {
    setEditingId(s.id);
    setForm(toForm(s));
    setErrors({});
    setBanner(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Runs `apply` now, or after confirmation when it would overwrite existing content. */
  function applyWithConfirm(title: string, fields: Target[], apply: () => void) {
    if (hasContent(form, fields)) setPending({ title, apply });
    else apply();
  }

  const templateCopy = (tpl: ScenarioTemplate) => t.templates[tpl.id] ?? tpl;

  function applyTemplate(tpl: ScenarioTemplate) {
    const { title } = templateCopy(tpl);
    applyWithConfirm(t.scenarios.replaceWithTemplate(title), ["name", "systemPrompt", "firstMessage", "personaPrompt", "scriptedTurns"], () => {
      setForm(templateToForm(tpl.variants[templateLang]));
      setErrors({});
      toast.success(t.scenarios.templateLoaded(title));
    });
  }

  function applyDraft(draft: ScenarioDraft, language: string) {
    const fields: Target[] = ["systemPrompt", "firstMessage"];
    if (draft.scriptedTurns?.length) fields.push("scriptedTurns");
    if (draft.personaPrompt) fields.push("personaPrompt");
    applyWithConfirm(t.scenarios.replaceWithDraft, fields, () => {
      setForm((f) => ({
        ...f,
        name: f.name.trim() ? f.name : draft.name,
        systemPrompt: draft.systemPrompt,
        firstMessage: draft.firstMessage,
        language,
        ...(draft.scriptedTurns?.length ? { userMode: "scripted" as const, scriptedTurns: draft.scriptedTurns } : {}),
        ...(draft.personaPrompt ? { userMode: "persona" as const, personaPrompt: draft.personaPrompt } : {}),
      }));
      setErrors({});
      setGenerateOpen(false);
      toast.success(t.scenarios.draftApplied);
    });
  }

  const userEmpty = form.userMode === "scripted" ? !form.scriptedTurns.some((turn) => turn.trim()) : !form.personaPrompt.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setBanner(null);
    try {
      const body = {
        ...form,
        personaPrompt: form.userMode === "persona" ? form.personaPrompt : null,
        scriptedTurns: form.userMode === "scripted" ? form.scriptedTurns.filter((turn) => turn.trim()) : null,
      };
      if (editingId) await api(`/api/scenarios/${editingId}`, { method: "PUT", json: body });
      else await api("/api/scenarios", { method: "POST", json: body });
      toast.success(editingId ? t.scenarios.saved(form.name) : t.scenarios.created(form.name));
      reset();
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setBanner((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Scenario) {
    try {
      await api(`/api/scenarios/${s.id}`, { method: "DELETE" });
      if (editingId === s.id) reset();
      toast.success(t.scenarios.deleted(s.name));
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.scenarios.title} description={t.scenarios.description} />

      <div className="grid items-start gap-6 lg:grid-cols-[480px_1fr]">
        <form onSubmit={submit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? t.scenarios.editTitle : t.scenarios.newTitle}</CardTitle>
              <CardDescription>{t.scenarios.formDescription}</CardDescription>
              <CardAction className="flex gap-1.5">
                <DropdownMenu onOpenChange={(open) => open && setTemplateLang(isScenarioLanguage(form.language) ? form.language : locale)}>
                  <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" data-tour="scenario-templates" />}>
                    <LayoutTemplateIcon data-icon="inline-start" />
                    {t.scenarios.templates}
                    <ChevronDownIcon data-icon="inline-end" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t.scenarios.language}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={templateLang} onValueChange={(v) => setTemplateLang(v as TemplateLanguage)}>
                        {TEMPLATE_LANGUAGES.map((code) => (
                          <DropdownMenuRadioItem key={code} value={code}>
                            {t.languages[code]}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t.scenarios.templates}</DropdownMenuLabel>
                      {templates.map((tpl) => {
                        const Icon = TEMPLATE_ICONS[tpl.icon];
                        const copy = templateCopy(tpl);
                        return (
                          <DropdownMenuItem key={tpl.id} className="items-start" onClick={() => applyTemplate(tpl)}>
                            <Icon className="mt-0.5" />
                            <span className="flex flex-col gap-0.5">
                              <span className="font-medium">{copy.title}</span>
                              <span className="text-xs text-muted-foreground">{copy.description}</span>
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                {assist.model ? (
                  <Button type="button" size="sm" onClick={() => setGenerateOpen(true)} data-tour="scenario-generate">
                    <SparklesIcon data-icon="inline-start" />
                    {t.scenarios.generate}
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger render={<span tabIndex={0} data-tour="scenario-generate" />}>
                      <Button type="button" size="sm" disabled>
                        <SparklesIcon data-icon="inline-start" />
                        {t.scenarios.generate}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <Rich text={t.scenarios.generateMissing(assist.missing.map((v) => `\`${v}\``).join(", "))} />
                    </TooltipContent>
                  </Tooltip>
                )}
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ErrorBanner message={banner} />
              <Field label={t.scenarios.name} htmlFor="name" error={errors.name}>
                <Input id="name" value={form.name} onChange={set("name")} placeholder={t.scenarios.namePlaceholder} aria-invalid={!!errors.name} />
              </Field>
              <div className="flex flex-col gap-4" data-tour="scenario-agent">
              <Field label={t.scenarios.systemPrompt} htmlFor="systemPrompt" error={errors.systemPrompt}>
                <Textarea
                  id="systemPrompt"
                  rows={5}
                  value={form.systemPrompt}
                  onChange={set("systemPrompt")}
                  placeholder={t.scenarios.systemPromptPlaceholder}
                  aria-invalid={!!errors.systemPrompt}
                />
              </Field>
              <Field label={t.scenarios.firstMessage} htmlFor="firstMessage" error={errors.firstMessage} hint={t.scenarios.firstMessageHint}>
                <Input id="firstMessage" value={form.firstMessage} onChange={set("firstMessage")} aria-invalid={!!errors.firstMessage} />
              </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.scenarios.language} htmlFor="language" error={errors.language}>
                  <NativeSelect id="language" value={form.language} onChange={set("language")}>
                    {SCENARIO_LANGUAGES.map((code) => (
                      <option key={code} value={code}>
                        {t.languages[code]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label={t.scenarios.maxTurns} htmlFor="maxTurns" error={errors.maxTurns}>
                  <Input id="maxTurns" type="number" min={2} max={50} className="tabular-nums" value={form.maxTurns} onChange={set("maxTurns")} />
                </Field>
              </div>

              <div className="flex flex-col gap-4" data-tour="scenario-user">
              <Field label={t.scenarios.simulatedUser}>
                <ToggleGroup
                  variant="outline"
                  value={[form.userMode]}
                  onValueChange={(v: string[]) => v[0] && setForm((f) => ({ ...f, userMode: v[0] as Form["userMode"] }))}
                  aria-label={t.scenarios.simulatedUserMode}
                  className="w-full"
                >
                  <ToggleGroupItem value="scripted" className="flex-1">
                    <ListOrderedIcon data-icon="inline-start" /> {t.scenarios.scripted}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="persona" className="flex-1">
                    <UserRoundIcon data-icon="inline-start" /> {t.scenarios.persona}
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              {form.userMode === "persona" ? (
                <Field
                  label={t.scenarios.personaPrompt}
                  htmlFor="personaPrompt"
                  error={errors.personaPrompt}
                  hint={t.scenarios.personaPromptHint}
                >
                  <Textarea id="personaPrompt" rows={4} value={form.personaPrompt} onChange={set("personaPrompt")} aria-invalid={!!errors.personaPrompt} />
                </Field>
              ) : (
                <Field label={t.scenarios.scriptedTurns} error={errors.scriptedTurns} hint={t.scenarios.scriptedTurnsHint}>
                  <div className="flex flex-col gap-2">
                    {form.scriptedTurns.map((turn, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                        <Input value={turn} onChange={(e) => setTurn(i, e.target.value)} placeholder={t.scenarios.userTurn(i + 1)} aria-label={t.scenarios.userTurn(i + 1)} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t.scenarios.removeTurn(i + 1)}
                          disabled={form.scriptedTurns.length === 1}
                          onClick={() => setForm((f) => ({ ...f, scriptedTurns: f.scriptedTurns.filter((_, j) => j !== i) }))}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-7 self-start"
                      onClick={() => setForm((f) => ({ ...f, scriptedTurns: [...f.scriptedTurns, ""] }))}
                    >
                      <PlusIcon data-icon="inline-start" /> {t.scenarios.addTurn}
                    </Button>
                  </div>
                </Field>
              )}
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              {editingId ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  {t.common.cancel}
                </Button>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {editingId ? t.scenarios.saveChanges : t.scenarios.createScenario}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {scenarios.length === 0 ? (
          <Empty className="border border-dashed" data-tour="scenario-list">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollTextIcon />
              </EmptyMedia>
              <EmptyTitle>{t.scenarios.emptyTitle}</EmptyTitle>
              <EmptyDescription>{t.scenarios.emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4" data-tour="scenario-list">
            {scenarios.map((s) => (
              <Card key={s.id} size="sm" className={editingId === s.id ? "ring-2 ring-primary" : undefined}>
                <CardHeader>
                  <CardTitle className="truncate">{s.name}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-1">
                    <Badge variant="outline">{isScenarioLanguage(s.language) ? t.languages[s.language] : s.language}</Badge>
                    <Badge variant="secondary">
                      {s.userMode === "scripted" ? (
                        <>
                          <ListOrderedIcon data-icon="inline-start" />
                          {t.scenarios.scriptedCount(s.scriptedTurns?.length ?? 0)}
                        </>
                      ) : (
                        <>
                          <UserRoundIcon data-icon="inline-start" />
                          {t.scenarios.persona}
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline">{t.scenarios.maxTurnsBadge(s.maxTurns)}</Badge>
                  </CardDescription>
                  <CardAction className="flex gap-0.5">
                    <Button size="icon-sm" variant="ghost" aria-label={t.scenarios.editAria(s.name)} onClick={() => edit(s)}>
                      <PencilIcon />
                    </Button>
                    <ConfirmButton
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t.scenarios.deleteAria(s.name)}
                      title={t.scenarios.deleteTitle(s.name)}
                      description={t.scenarios.deleteDescription}
                      confirmLabel={t.common.delete}
                      onConfirm={() => remove(s)}
                    >
                      <Trash2Icon />
                    </ConfirmButton>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="flex gap-2">
                    <BotIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="line-clamp-2 text-muted-foreground">{s.systemPrompt}</p>
                  </div>
                  <div className="flex gap-2">
                    <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="line-clamp-1 italic">“{s.firstMessage}”</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        model={assist.model}
        defaults={{
          description: form.name,
          language: isScenarioLanguage(form.language) ? form.language : locale,
          userMode: form.userMode,
          includeUser: userEmpty,
        }}
        onApply={applyDraft}
      />

      <AlertDialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{t.scenarios.replaceDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.scenarios.keepCurrent}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pending?.apply();
                setPending(null);
              }}
            >
              {t.scenarios.replace}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
