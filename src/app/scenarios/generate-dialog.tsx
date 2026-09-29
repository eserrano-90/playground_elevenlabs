"use client";

import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { ApiError, api } from "@/lib/fetcher";
import { useT } from "@/lib/i18n/client";
import { SCENARIO_LANGUAGES, type ScenarioLanguage } from "@/lib/validation";

export interface ScenarioDraft {
  name: string;
  systemPrompt: string;
  firstMessage: string;
  scriptedTurns?: string[];
  personaPrompt?: string;
}

export interface GenerateDefaults {
  description: string;
  language: ScenarioLanguage;
  userMode: "persona" | "scripted";
  includeUser: boolean;
}

type Inputs = GenerateDefaults & { tone: string };

export function GenerateDialog({
  open,
  onOpenChange,
  defaults,
  model,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: GenerateDefaults;
  model: string | null;
  onApply: (draft: ScenarioDraft, language: Inputs["language"]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* Mounted per open, so each session starts from the current form's defaults. */}
        {open ? <GenerateFlow defaults={defaults} model={model} onApply={onApply} onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function GenerateFlow({
  defaults,
  model,
  onApply,
  onCancel,
}: {
  defaults: GenerateDefaults;
  model: string | null;
  onApply: (draft: ScenarioDraft, language: Inputs["language"]) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [inputs, setInputs] = useState<Inputs>({ ...defaults, tone: "" });
  const [draft, setDraft] = useState<ScenarioDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: "description" | "tone" | "language") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setInputs((i) => ({ ...i, [k]: e.target.value }));

  async function generate() {
    setBusy(true);
    setErrors({});
    try {
      const res = await api<{ draft: ScenarioDraft }>("/api/scenarios/generate", {
        method: "POST",
        json: { ...inputs, tone: inputs.tone || undefined },
      });
      setDraft(res.draft);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const footnote = model ? <p className="text-xs text-muted-foreground">{t.scenarios.gen.footnote(model)}</p> : null;

  if (draft) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t.scenarios.gen.reviewTitle}</DialogTitle>
          <DialogDescription>{t.scenarios.gen.reviewDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto text-sm">
          <Preview label={t.scenarios.name}>{draft.name}</Preview>
          <Preview label={t.scenarios.systemPrompt}>
            <p className="whitespace-pre-wrap text-muted-foreground">{draft.systemPrompt}</p>
          </Preview>
          <Preview label={t.scenarios.firstMessage}>
            <p className="italic">“{draft.firstMessage}”</p>
          </Preview>
          {draft.scriptedTurns?.length ? (
            <Preview label={t.scenarios.scriptedTurns}>
              <ol className="flex list-decimal flex-col gap-1 pl-5 marker:text-muted-foreground">
                {draft.scriptedTurns.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </Preview>
          ) : null}
          {draft.personaPrompt ? (
            <Preview label={t.scenarios.personaPrompt}>
              <p className="whitespace-pre-wrap text-muted-foreground">{draft.personaPrompt}</p>
            </Preview>
          ) : null}
        </div>
        {footnote}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
            <ArrowLeftIcon data-icon="inline-start" />
            {t.common.back}
          </Button>
          <Button type="button" variant="outline" onClick={generate} disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            {t.scenarios.gen.regenerate}
          </Button>
          <Button type="button" onClick={() => onApply(draft, inputs.language)} disabled={busy}>
            <CheckIcon data-icon="inline-start" />
            {t.scenarios.gen.apply}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void generate();
      }}
      noValidate
    >
      <DialogHeader>
        <DialogTitle>{t.scenarios.gen.title}</DialogTitle>
        <DialogDescription>{t.scenarios.gen.description}</DialogDescription>
      </DialogHeader>
      <Field label={t.scenarios.gen.useCase} htmlFor="gen-description" error={errors.description} hint={t.scenarios.gen.useCaseHint}>
        <Textarea
          id="gen-description"
          rows={4}
          value={inputs.description}
          onChange={set("description")}
          placeholder={t.scenarios.gen.useCasePlaceholder}
          aria-invalid={!!errors.description}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.scenarios.language} htmlFor="gen-language" error={errors.language}>
          <NativeSelect id="gen-language" value={inputs.language} onChange={set("language")}>
            {SCENARIO_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {t.languages[code]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t.scenarios.gen.tone} htmlFor="gen-tone" error={errors.tone}>
          <Input id="gen-tone" value={inputs.tone} onChange={set("tone")} placeholder={t.scenarios.gen.tonePlaceholder} maxLength={60} />
        </Field>
      </div>
      <Separator />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="gen-include-user">{t.scenarios.gen.includeUser}</Label>
          <p className="text-xs text-muted-foreground">
            {inputs.userMode === "scripted" ? t.scenarios.gen.includeScripted : t.scenarios.gen.includePersona}
          </p>
        </div>
        <Switch id="gen-include-user" checked={inputs.includeUser} onCheckedChange={(v) => setInputs((i) => ({ ...i, includeUser: v }))} />
      </div>
      {footnote}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
          {busy ? t.scenarios.gen.generating : t.scenarios.generate}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Preview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
