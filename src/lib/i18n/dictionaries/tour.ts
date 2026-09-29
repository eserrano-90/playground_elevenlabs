const en = {
  skip: "Skip",
  back: "Back",
  next: "Next",
  done: "Done",
  progress: (n: number, total: number) => `${n} of ${total}`,
  close: "Close tour",
  replay: "Tour this page",
  replayTooltip: "Take a tour of this page",
};

const es: typeof en = {
  skip: "Omitir",
  back: "Atrás",
  next: "Siguiente",
  done: "Listo",
  progress: (n, total) => `${n} de ${total}`,
  close: "Cerrar recorrido",
  replay: "Recorrido de la página",
  replayTooltip: "Haz un recorrido por esta página",
};

const fr: typeof en = {
  skip: "Passer",
  back: "Retour",
  next: "Suivant",
  done: "Terminé",
  progress: (n, total) => `${n} sur ${total}`,
  close: "Fermer la visite",
  replay: "Visite de la page",
  replayTooltip: "Faire la visite guidée de cette page",
};

export const tour = { en, es, fr };
