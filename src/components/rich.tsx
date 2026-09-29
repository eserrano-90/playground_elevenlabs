import { parseRich } from "@/lib/i18n/rich";

/** Renders a dictionary string with `**bold**`, `*em*` and `` `code` `` marks. */
export function Rich({ text }: { text: string }) {
  return parseRich(text).map((t, i) =>
    t.type === "strong" ? (
      <strong key={i}>{t.text}</strong>
    ) : t.type === "em" ? (
      <em key={i}>{t.text}</em>
    ) : t.type === "code" ? (
      <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        {t.text}
      </code>
    ) : (
      t.text
    ),
  );
}
