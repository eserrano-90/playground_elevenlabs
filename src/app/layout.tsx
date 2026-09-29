import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TourProvider } from "@/components/tour";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTIONS = {
  en: "Benchmark ElevenLabs agents across LLMs, TTS models and voices: complexity, latency and cost per minute.",
  es: "Compara agentes de ElevenLabs entre LLM, modelos TTS y voces: complejidad, latencia y coste por minuto.",
  fr: "Comparez des agents ElevenLabs selon le LLM, le modèle TTS et la voix : complexité, latence et coût par minute.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "ElevenLabs Agent Bench", description: DESCRIPTIONS[await getLocale()] };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <TourProvider>
                <Nav />
                <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
              </TourProvider>
              <Toaster richColors closeButton />
            </TooltipProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
