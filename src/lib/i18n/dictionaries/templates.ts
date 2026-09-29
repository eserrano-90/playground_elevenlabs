/** Template picker copy, keyed by template id. */
const en: Record<string, { title: string; description: string }> = {
  "customer-service": {
    title: "Customer service",
    description: "Support agent for an online store handling a late order and a return.",
  },
  "restaurant-booking": {
    title: "Restaurant booking",
    description: "Host taking a table reservation with a dietary request.",
  },
  "medical-appointment": {
    title: "Medical appointment",
    description: "Clinic receptionist scheduling a visit. Scheduling only, no medical advice.",
  },
};

const es: typeof en = {
  "customer-service": {
    title: "Atención al cliente",
    description: "Agente de soporte de una tienda online que gestiona un pedido retrasado y una devolución.",
  },
  "restaurant-booking": {
    title: "Reserva de restaurante",
    description: "Anfitrión que toma una reserva de mesa con una petición dietética.",
  },
  "medical-appointment": {
    title: "Cita médica",
    description: "Recepcionista de clínica que agenda una visita. Solo citas, sin consejo médico.",
  },
};

const fr: typeof en = {
  "customer-service": {
    title: "Service client",
    description: "Agent d'assistance d'une boutique en ligne gérant une commande en retard et un retour.",
  },
  "restaurant-booking": {
    title: "Réservation au restaurant",
    description: "Hôte prenant une réservation de table avec une demande alimentaire.",
  },
  "medical-appointment": {
    title: "Rendez-vous médical",
    description: "Réceptionniste de clinique planifiant une visite. Prise de rendez-vous uniquement, sans conseil médical.",
  },
};

export const templates = { en, es, fr };
