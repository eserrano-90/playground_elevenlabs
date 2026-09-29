export type RichToken = { type: "text" | "strong" | "em" | "code"; text: string };

const MARKS = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/;

/** Splits `**bold**`, `*em*` and `` `code` `` spans out of a dictionary string. Nothing else is parsed. */
export function parseRich(text: string): RichToken[] {
  return text
    .split(MARKS)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
        return { type: "strong", text: part.slice(2, -2) };
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
        return { type: "code", text: part.slice(1, -1) };
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
        return { type: "em", text: part.slice(1, -1) };
      return { type: "text", text: part };
    });
}
