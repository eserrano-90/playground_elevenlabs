"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { ArrowLeftIcon, ArrowRightIcon, CircleHelpIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/client";
import { tourForPath, type TourStep } from "@/lib/tours";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "agent-bench:tour:";
const SPOTLIGHT_PADDING = 6;

interface TourContextValue {
  /** Starts the tour for the current page, if it has one. */
  start: () => void;
  available: boolean;
}

const TourContext = React.createContext<TourContextValue>({ start: () => {}, available: false });

export const useTour = () => React.useContext(TourContext);

/** Anchor for steps without a target: slightly above the middle of the viewport. */
const viewportCenter = {
  getBoundingClientRect: () => new DOMRect(window.innerWidth / 2, window.innerHeight / 2 - 120, 0, 0),
};

const findTarget = (step: TourStep) => (step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null);

/** Keeps the tour for the current route, auto-starts it on the first visit and renders the active step. */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  // Memoized: a new tour object each render would restart the auto-start timer.
  const tour = React.useMemo(() => tourForPath(pathname, t), [pathname, t]);
  // Keyed by tour id so a tour started on one page doesn't show after navigating to another.
  const [active, setActive] = React.useState<{ tourId: string; steps: TourStep[] } | null>(null);
  const [index, setIndex] = React.useState(0);
  const steps = active && active.tourId === tour?.id ? active.steps : null;

  const start = React.useCallback(() => {
    if (!tour) return;
    // Skip steps whose anchor isn't on the page (e.g. a list that is still empty).
    const visible = tour.steps.filter((s) => !s.target || findTarget(s));
    if (visible.length === 0) return;
    setIndex(0);
    setActive({ tourId: tour.id, steps: visible });
  }, [tour]);

  const finish = React.useCallback(() => {
    if (tour) localStorage.setItem(STORAGE_PREFIX + tour.id, "done");
    setActive(null);
  }, [tour]);

  // Auto-start once per page on the first visit.
  React.useEffect(() => {
    if (!tour || localStorage.getItem(STORAGE_PREFIX + tour.id)) return;
    const timer = window.setTimeout(start, 600);
    return () => window.clearTimeout(timer);
  }, [tour, start]);

  const value = React.useMemo(() => ({ start, available: tour != null }), [start, tour]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {steps ? (
        <TourStepView
          key={index}
          step={steps[index]}
          index={index}
          total={steps.length}
          onBack={() => setIndex((i) => Math.max(0, i - 1))}
          onNext={() => (index === steps.length - 1 ? finish() : setIndex((i) => i + 1))}
          onClose={finish}
        />
      ) : null}
    </TourContext.Provider>
  );
}

/** Tracks the target's viewport rect every frame so the spotlight follows scrolling and layout changes. */
function useTargetRect(target: HTMLElement | null) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    let frame = 0;
    const tick = () => {
      const r = target.getBoundingClientRect();
      setRect((prev) =>
        prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : r,
      );
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return rect;
}

function TourStepView({
  step,
  index,
  total,
  onBack,
  onNext,
  onClose,
}: {
  step: TourStep;
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [target] = React.useState(() => findTarget(step));
  const rect = useTargetRect(target);
  const t = useT();
  const last = index === total - 1;
  const nextRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      {/* Blocks clicks on the page; the spotlight's shadow dims everything except the target. */}
      <div className="fixed inset-0 z-50" aria-hidden onClick={(e) => e.stopPropagation()} />
      {target && rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 rounded-lg shadow-[0_0_0_9999px_rgb(0_0_0/0.45)] ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 z-50 bg-black/45" />
      )}
      <PopoverPrimitive.Root open onOpenChange={(open, details) => !open && details.reason === "escape-key" && onClose()} modal="trap-focus">
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            anchor={target ?? viewportCenter}
            side={target ? (step.side ?? "bottom") : "bottom"}
            align={target ? "start" : "center"}
            sideOffset={target ? SPOTLIGHT_PADDING + 8 : 0}
            collisionPadding={16}
            className="isolate z-50 outline-none"
          >
            <PopoverPrimitive.Popup
              initialFocus={nextRef}
              className="flex w-80 max-w-[calc(100vw-2rem)] origin-(--transform-origin) flex-col gap-3 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.tour.progress(index + 1, total)}
                  </span>
                  <PopoverPrimitive.Title className="font-medium">{step.title}</PopoverPrimitive.Title>
                </div>
                <Button variant="ghost" size="icon-xs" aria-label={t.tour.close} onClick={onClose}>
                  <XIcon />
                </Button>
              </div>
              <PopoverPrimitive.Description className="text-muted-foreground">{step.body}</PopoverPrimitive.Description>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1" aria-hidden>
                  {Array.from({ length: total }, (_, i) => (
                    <span key={i} className={cn("size-1.5 rounded-full bg-muted-foreground/30", i === index && "bg-primary")} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {index > 0 ? (
                    <Button variant="outline" size="sm" onClick={onBack}>
                      <ArrowLeftIcon data-icon="inline-start" />
                      {t.tour.back}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      {t.tour.skip}
                    </Button>
                  )}
                  <Button ref={nextRef} size="sm" onClick={onNext}>
                    {last ? t.tour.done : t.tour.next}
                    {last ? null : <ArrowRightIcon data-icon="inline-end" />}
                  </Button>
                </div>
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  );
}

/** Nav button that replays the current page's tour. */
export function TourButton() {
  const { start, available } = useTour();
  const t = useT();
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t.tour.replayTooltip} disabled={!available} onClick={start} data-tour="tour-button" />}
      >
        <CircleHelpIcon />
      </TooltipTrigger>
      <TooltipContent>{t.tour.replay}</TooltipContent>
    </Tooltip>
  );
}
