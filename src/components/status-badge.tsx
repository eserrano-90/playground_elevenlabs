"use client";

import { BanIcon, CheckIcon, CircleDashedIcon, CircleIcon, Loader2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/client";

const STATUS: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  completed: { variant: "default", icon: CheckIcon },
  running: { variant: "secondary", icon: Loader2Icon },
  pending: { variant: "outline", icon: CircleDashedIcon },
  draft: { variant: "outline", icon: CircleIcon },
  failed: { variant: "destructive", icon: XIcon },
  cancelled: { variant: "outline", icon: BanIcon },
};

export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const s = STATUS[status] ?? { variant: "outline" as const, icon: CircleIcon };
  return (
    <Badge variant={s.variant} className="capitalize">
      <s.icon data-icon="inline-start" className={status === "running" ? "animate-spin" : undefined} />
      {t.status[status as keyof typeof t.status] ?? status}
    </Badge>
  );
}

/** Marks whether a cost/duration was reported by ElevenLabs or estimated locally. */
export function SourceBadge({ source }: { source: string | null | undefined }) {
  const t = useT();
  if (!source) return null;
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant={source === "reported" ? "secondary" : "outline"} />}>
        {source === "estimated" ? t.common.estimated : source === "reported" ? t.common.reported : source}
      </TooltipTrigger>
      <TooltipContent>{source === "estimated" ? t.common.estimatedTooltip : t.common.reportedTooltip}</TooltipContent>
    </Tooltip>
  );
}
