export const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#4b5563", "#ea580c"];

export const colorAt = (i: number) => PALETTE[i % PALETTE.length];
