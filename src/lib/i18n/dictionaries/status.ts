const en = {
  completed: "completed",
  running: "running",
  pending: "pending",
  draft: "draft",
  failed: "failed",
  cancelled: "cancelled",
} as Record<"completed" | "running" | "pending" | "draft" | "failed" | "cancelled", string>;

const es: typeof en = {
  completed: "completado",
  running: "en curso",
  pending: "pendiente",
  draft: "borrador",
  failed: "fallido",
  cancelled: "cancelado",
};

const fr: typeof en = {
  completed: "terminé",
  running: "en cours",
  pending: "en attente",
  draft: "brouillon",
  failed: "échoué",
  cancelled: "annulé",
};

export const status = { en, es, fr };
