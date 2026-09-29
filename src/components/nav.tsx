"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLinesIcon, BarChart3Icon, BlocksIcon, BookOpenIcon, MicIcon, ScrollTextIcon, SettingsIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { TourButton } from "@/components/tour";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", key: "benchmarks", icon: BarChart3Icon, match: (p: string) => p === "/" || p.startsWith("/benchmarks") || p.startsWith("/runs") },
  { href: "/variants", key: "variants", icon: BlocksIcon, match: (p: string) => p.startsWith("/variants") },
  { href: "/scenarios", key: "scenarios", icon: ScrollTextIcon, match: (p: string) => p.startsWith("/scenarios") },
  { href: "/live", key: "live", icon: MicIcon, match: (p: string) => p.startsWith("/live") },
  { href: "/metrics", key: "metrics", icon: BookOpenIcon, match: (p: string) => p.startsWith("/metrics") },
  { href: "/settings", key: "settings", icon: SettingsIcon, match: (p: string) => p.startsWith("/settings") },
] as const;

export function Nav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <AudioLinesIcon className="size-4" />
          </span>
          <span className="hidden sm:inline">{t.nav.brand}</span>
        </Link>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                data-tour={`nav-${l.key}`}
                aria-current={active ? "page" : undefined}
                aria-label={t.nav[l.key]}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                <l.icon className="size-4" />
                <span className="hidden md:inline">{t.nav[l.key]}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <TourButton />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
