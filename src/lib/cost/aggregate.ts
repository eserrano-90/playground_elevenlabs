export interface Stats {
  n: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
}

/** Ignores null/NaN values. Sample standard deviation (n-1); 0 for a single value. */
export function stats(values: (number | null | undefined)[]): Stats {
  const xs = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (xs.length === 0) return { n: 0, mean: null, min: null, max: null, std: null };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.length > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1) : 0;
  return { n: xs.length, mean, min: Math.min(...xs), max: Math.max(...xs), std: Math.sqrt(variance) };
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}
