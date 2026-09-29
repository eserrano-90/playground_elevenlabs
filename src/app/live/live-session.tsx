"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import Link from "next/link";
import { ArrowRightIcon, MicIcon, PhoneOffIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ErrorBanner, Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { api } from "@/lib/fetcher";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface Option {
  id: number;
  name: string;
}

type Phase = "idle" | "starting" | "live" | "finalizing";

export function LiveSession(props: { variants: Option[]; scenarios: Option[]; judgeAvailable: boolean }) {
  return (
    <ConversationProvider>
      <LiveSessionInner {...props} />
    </ConversationProvider>
  );
}

function LiveSessionInner({ variants, scenarios, judgeAvailable }: { variants: Option[]; scenarios: Option[]; judgeAvailable: boolean }) {
  const router = useRouter();
  const t = useT().live;
  const conversation = useConversation();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? 0);
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? 0);
  const [judge, setJudge] = useState(judgeAvailable);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; message: string }[]>([]);
  const [lastRunId, setLastRunId] = useState<number | null>(null);

  // Refs because SDK callbacks outlive the render that registered them.
  const session = useRef<{ runId: number; conversationId: string | null; finished: boolean } | null>(null);

  async function finish(reason?: string) {
    const s = session.current;
    if (!s || s.finished) return;
    s.finished = true;
    setPhase("finalizing");
    try {
      await api(`/api/live/${s.runId}/complete`, {
        method: "POST",
        json: s.conversationId ? { conversationId: s.conversationId, judge } : { error: reason ?? "Session ended before connecting" },
      });
      setLastRunId(s.runId);
      toast.success(t.runSaved(s.runId), {
        action: { label: t.view, onClick: () => router.push(`/runs/${s.runId}`) },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      session.current = null;
      setPhase("idle");
      router.refresh();
    }
  }

  async function start() {
    setError(null);
    setMessages([]);
    setLastRunId(null);
    setPhase("starting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t.micRequired);
      setPhase("idle");
      return;
    }
    try {
      const { runId, token } = await api<{ runId: number; token: string }>("/api/live/session", {
        method: "POST",
        json: { variantId, scenarioId },
      });
      session.current = { runId, conversationId: null, finished: false };
      conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        onConnect: ({ conversationId }) => {
          if (session.current) session.current.conversationId = conversationId;
          setPhase("live");
        },
        onMessage: ({ role, message }) => setMessages((m) => [...m, { role, message }]),
        onDisconnect: () => void finish(),
        onError: (message) => {
          setError(message);
          void finish(message);
        },
      });
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";

  if (!variants.length || !scenarios.length) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MicIcon />
          </EmptyMedia>
          <EmptyTitle>{t.emptyTitle}</EmptyTitle>
          <EmptyDescription>{t.emptyDescription}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={variants.length ? "/scenarios" : "/variants"} className={buttonVariants()}>
            {variants.length ? t.writeScenario : t.createVariant}
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.sessionTitle}</CardTitle>
        <CardDescription>{t.sessionDescription}</CardDescription>
        <CardAction>
          <PhaseBadge phase={phase} speaking={conversation.isSpeaking} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.variant} htmlFor="variant">
            <NativeSelect id="variant" value={variantId} disabled={busy} onChange={(e) => setVariantId(Number(e.target.value))}>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t.scenario} htmlFor="scenario" hint={t.scenarioHint}>
            <NativeSelect id="scenario" value={scenarioId} disabled={busy} onChange={(e) => setScenarioId(Number(e.target.value))}>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="live-judge" checked={judge} disabled={!judgeAvailable || busy} onCheckedChange={setJudge} />
          <Label htmlFor="live-judge">{t.judge}</Label>
          {!judgeAvailable ? <span className="text-xs text-muted-foreground">{t.judgeNotConfigured}</span> : null}
        </div>
        {messages.length ? (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border p-3" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "agent" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", m.role === "agent" ? "bg-muted" : "border border-dashed")}>
                  <span className="block text-xs text-muted-foreground capitalize">{t.roles[m.role] ?? m.role}</span>
                  {m.message}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t">
        {lastRunId ? (
          <Link href={`/runs/${lastRunId}`} className={buttonVariants({ variant: "link", size: "sm" })}>
            {t.viewRun(lastRunId)}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        ) : (
          <span />
        )}
        {phase === "live" ? (
          <Button variant="destructive" onClick={() => conversation.endSession()}>
            <PhoneOffIcon data-icon="inline-start" /> {t.endSession}
          </Button>
        ) : (
          <Button onClick={start} disabled={busy || !variantId || !scenarioId}>
            {busy ? <Spinner data-icon="inline-start" /> : <MicIcon data-icon="inline-start" />}
            {phase === "starting" ? t.connecting : phase === "finalizing" ? t.saving : t.startTalking}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function PhaseBadge({ phase, speaking }: { phase: Phase; speaking: boolean }) {
  const t = useT().live;
  if (phase === "live")
    return (
      <Badge variant="secondary">
        <span className={cn("size-2 rounded-full bg-primary", !speaking && "animate-pulse")} aria-hidden />
        {speaking ? t.agentSpeaking : t.listening}
      </Badge>
    );
  if (phase === "starting") return <Badge variant="outline">{t.connecting}</Badge>;
  if (phase === "finalizing") return <Badge variant="outline">{t.fetchingDetails}</Badge>;
  return <Badge variant="outline">{t.idle}</Badge>;
}
