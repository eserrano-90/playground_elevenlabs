const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

/** Splits on terminal punctuation; text without punctuation counts as one sentence. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…¿¡])\s+|[\r\n]+/u)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}

/** English syllable heuristic: vowel groups, minus silent trailing "e", min 1. */
export function syllablesEn(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

const STRONG = "aeoáéóíú"; // accented i/u break diphthongs (hiato)
const WEAK = "iuü";

/** Spanish syllables = vowel nuclei; strong+strong vowels form a hiato (two nuclei). */
export function syllablesEs(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
  if (!w) return 0;
  let count = 0;
  let prev: "strong" | "weak" | null = null;
  for (const ch of w) {
    const kind = STRONG.includes(ch) ? "strong" : WEAK.includes(ch) || ch === "y" ? "weak" : null;
    if (ch === "y" && prev === null) {
      // consonantal y at syllable onset
      prev = null;
      continue;
    }
    if (kind === null) {
      prev = null;
      continue;
    }
    if (prev === null || (prev === "strong" && kind === "strong")) count++;
    prev = kind;
  }
  return Math.max(1, count);
}

const FR_VOWELS = "aeiouyàâäéèêëîïôöùûüœæ";
const FR_GROUP = new RegExp(`[${FR_VOWELS}]+`, "g");
const FR_SILENT_E = new RegExp(`[^${FR_VOWELS}]es?$`);

/**
 * French syllable heuristic: vowel groups, minus a final silent "e"/"es" when the word has
 * more than one group. "-ent" is not subtracted (verb vs noun is ambiguous). Min 1.
 */
export function syllablesFr(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zàâäçéèêëîïôöùûüœæ]/g, "");
  if (!w) return 0;
  const groups = w.match(FR_GROUP)?.length ?? 0;
  if (groups > 1 && FR_SILENT_E.test(w)) return groups - 1;
  return Math.max(1, groups);
}

const SYLLABLE_COUNTERS: Record<string, (word: string) => number> = { es: syllablesEs, fr: syllablesFr };

export function syllables(word: string, language: string): number {
  return (SYLLABLE_COUNTERS[language.slice(0, 2).toLowerCase()] ?? syllablesEn)(word);
}
