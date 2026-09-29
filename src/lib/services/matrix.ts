export interface MatrixCell {
  variantId: number;
  scenarioId: number;
  repetition: number;
}

/** One run per (variant, scenario, repetition). */
export function expandMatrix(variantIds: number[], scenarioIds: number[], repetitions: number): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const variantId of variantIds) {
    for (const scenarioId of scenarioIds) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        cells.push({ variantId, scenarioId, repetition });
      }
    }
  }
  return cells;
}
