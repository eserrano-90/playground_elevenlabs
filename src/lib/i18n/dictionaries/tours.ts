type Step = { title: string; body: string };

const en = {
  home: {
    welcome: {
      title: "Welcome to Agent Bench",
      body: "Compare ElevenLabs agent setups (LLM × TTS model × voice) on response complexity, latency and cost per minute. This quick tour shows each section.",
    },
    variants: {
      title: "1. Variants",
      body: "A variant is one agent setup: an LLM, a TTS model and a voice. Create one per combination you want to compare.",
    },
    scenarios: {
      title: "2. Scenarios",
      body: "A scenario is the conversation every variant runs: the agent's system prompt, its first message and a simulated user. Start from a template or generate one with AI.",
    },
    benchmarks: {
      title: "3. Benchmarks",
      body: "A benchmark runs every selected variant against every selected scenario and ranks the results. You'll find all of them here.",
    },
    live: {
      title: "Live",
      body: "Talk to a variant yourself with your microphone. The session is measured and scored like a benchmark run.",
    },
    metrics: {
      title: "Metrics",
      body: "How latency, cost, complexity and judge scores are calculated, and where each one can mislead. Worth a read before trusting a ranking.",
    },
    settings: {
      title: "Settings",
      body: "Prices used for cost estimates: your ElevenLabs plan and the LLM token prices. Check them against your account.",
    },
    language: {
      title: "Language",
      body: "Switch the interface between English, Spanish and French. Scenario languages are chosen separately, per scenario.",
    },
    newBenchmark: {
      title: "Start a benchmark",
      body: "When you have at least one variant and one scenario, start here. You'll see a cost estimate before anything runs.",
    },
    tourButton: {
      title: "Need a refresher?",
      body: "Every page has its own short tour. Click this button to replay it any time.",
    },
  },
  variants: {
    form: {
      title: "Create a variant",
      body: "Pick an LLM, a TTS model and a voice. The name is free text; include the key choices so results are easy to read.",
    },
    advanced: {
      title: "Advanced settings",
      body: "Optional temperature, max tokens and voice tuning. Leave them blank to use the ElevenLabs defaults.",
    },
    list: {
      title: "Your variants",
      body: "Edit, duplicate or delete variants here. Duplicating is the quickest way to change one thing and compare.",
    },
  },
  scenarios: {
    templates: {
      title: "Start from a template",
      body: "Customer service, restaurant booking or medical appointment, in English, Spanish or French. The template fills the form; nothing is saved until you submit.",
    },
    generate: {
      title: "Generate with AI",
      body: "Describe the use case in a sentence and get a spoken-style system prompt and first message to review. Needs the JUDGE_* settings.",
    },
    agent: {
      title: "The agent",
      body: "The system prompt defines the agent's role, tone and limits. The first message is what it says when the call starts.",
    },
    user: {
      title: "The simulated user",
      body: "Scripted turns are said in the same order for every variant, which gives the fairest comparison. A persona lets an LLM improvise the caller.",
    },
    list: {
      title: "Your scenarios",
      body: "Saved scenarios appear here, ready to pick when you create a benchmark.",
    },
  },
  newBenchmark: {
    picks: {
      title: "Pick what to compare",
      body: "Every selected variant runs every selected scenario. Select at least one of each.",
    },
    summary: {
      title: "Check the run count",
      body: "Repetitions smooth out latency noise. The judge scores response quality if it's configured. Next you'll see a cost estimate to confirm.",
    },
  },
  benchmark: {
    actions: {
      title: "Benchmark actions",
      body: "Cancel a running benchmark, re-analyze stored transcripts after changing prices, or export the results as CSV or JSON.",
    },
    highlights: {
      title: "Highlights",
      body: "The cheapest, fastest and most complex variants at a glance, plus what the benchmark has cost so far.",
    },
    tabs: {
      title: "Dig into the results",
      body: "Results ranks variants, Charts plots the trade-offs, Compare shows answers side by side, and Runs lists every conversation.",
    },
  },
  live: {
    session: {
      title: "Talk to a variant",
      body: "Pick a variant and a scenario, then talk through your microphone. This measures real audio latency and voice quality, which simulated benchmarks can't.",
    },
    results: {
      title: "Live results",
      body: "Each finished call is analyzed like a benchmark run. ElevenLabs reports its duration and cost once the conversation is processed.",
    },
  },
  metrics: {
    sections: {
      title: "Metric reference",
      body: "Jump to a group: latency, cost, complexity, the LLM judge, and how runs are aggregated per variant.",
    },
    complexity: {
      title: "The complexity score",
      body: "The 0–100 score behind “Most complex”. The table shows each component's weight and the range mapped onto 0–1.",
    },
    cost: {
      title: "Reported vs estimated",
      body: "Simulated runs have no audio, so their cost is estimated. Rows marked “estimated” depend on the prices in Settings.",
    },
  },
  settings: {
    pricing: {
      title: "Pricing",
      body: "Your ElevenLabs plan and credit price. Cost per minute and benchmark estimates come from these numbers; verify them against your plan.",
    },
    llms: {
      title: "LLM prices",
      body: "USD per million tokens for each model. These models also fill the LLM picker on the variants page.",
    },
    agents: {
      title: "Maintenance",
      body: "Benchmarks create agents in your ElevenLabs account with the “bench-” prefix. Clean up leftovers here; other agents are never touched.",
    },
  },
} satisfies Record<string, Record<string, Step>>;

const es: typeof en = {
  home: {
    welcome: {
      title: "Bienvenido a Agent Bench",
      body: "Compara configuraciones de agentes de ElevenLabs (LLM × modelo TTS × voz) por complejidad de las respuestas, latencia y coste por minuto. Este breve recorrido muestra cada sección.",
    },
    variants: {
      title: "1. Variantes",
      body: "Una variante es una configuración de agente: un LLM, un modelo TTS y una voz. Crea una por cada combinación que quieras comparar.",
    },
    scenarios: {
      title: "2. Escenarios",
      body: "Un escenario es la conversación que ejecuta cada variante: el prompt de sistema del agente, su primer mensaje y un usuario simulado. Empieza con una plantilla o genera uno con IA.",
    },
    benchmarks: {
      title: "3. Benchmarks",
      body: "Un benchmark ejecuta cada variante seleccionada con cada escenario seleccionado y ordena los resultados. Aquí los encontrarás todos.",
    },
    live: {
      title: "En vivo",
      body: "Habla tú mismo con una variante usando el micrófono. La sesión se mide y puntúa como una ejecución de benchmark.",
    },
    metrics: {
      title: "Métricas",
      body: "Cómo se calculan la latencia, el coste, la complejidad y las puntuaciones del juez, y dónde puede engañar cada una. Merece la pena leerlo antes de fiarse de una clasificación.",
    },
    settings: {
      title: "Ajustes",
      body: "Precios usados para las estimaciones de coste: tu plan de ElevenLabs y los precios por token de los LLM. Compruébalos con tu cuenta.",
    },
    language: {
      title: "Idioma",
      body: "Cambia la interfaz entre inglés, español y francés. El idioma de cada escenario se elige por separado.",
    },
    newBenchmark: {
      title: "Crea un benchmark",
      body: "Cuando tengas al menos una variante y un escenario, empieza aquí. Verás una estimación del coste antes de que se ejecute nada.",
    },
    tourButton: {
      title: "¿Necesitas un repaso?",
      body: "Cada página tiene su propio recorrido breve. Pulsa este botón para repetirlo cuando quieras.",
    },
  },
  variants: {
    form: {
      title: "Crea una variante",
      body: "Elige un LLM, un modelo TTS y una voz. El nombre es libre; incluye las opciones clave para que los resultados se lean fácilmente.",
    },
    advanced: {
      title: "Ajustes avanzados",
      body: "Temperatura, máximo de tokens y ajuste de voz opcionales. Déjalos vacíos para usar los valores por defecto de ElevenLabs.",
    },
    list: {
      title: "Tus variantes",
      body: "Edita, duplica o elimina variantes aquí. Duplicar es la forma más rápida de cambiar una sola cosa y comparar.",
    },
  },
  scenarios: {
    templates: {
      title: "Empieza con una plantilla",
      body: "Atención al cliente, reserva de restaurante o cita médica, en inglés, español o francés. La plantilla rellena el formulario; no se guarda nada hasta que lo envíes.",
    },
    generate: {
      title: "Genera con IA",
      body: "Describe el caso de uso en una frase y obtén un prompt de sistema y un primer mensaje en estilo hablado para revisar. Requiere los ajustes JUDGE_*.",
    },
    agent: {
      title: "El agente",
      body: "El prompt de sistema define el papel, el tono y los límites del agente. El primer mensaje es lo que dice al empezar la llamada.",
    },
    user: {
      title: "El usuario simulado",
      body: "Los turnos guionizados se dicen en el mismo orden para cada variante, lo que da la comparación más justa. Una persona deja que un LLM improvise al llamante.",
    },
    list: {
      title: "Tus escenarios",
      body: "Los escenarios guardados aparecen aquí, listos para elegirlos al crear un benchmark.",
    },
  },
  newBenchmark: {
    picks: {
      title: "Elige qué comparar",
      body: "Cada variante seleccionada ejecuta cada escenario seleccionado. Selecciona al menos uno de cada.",
    },
    summary: {
      title: "Revisa el número de ejecuciones",
      body: "Las repeticiones suavizan el ruido de la latencia. El juez puntúa la calidad de las respuestas si está configurado. Después verás una estimación del coste para confirmar.",
    },
  },
  benchmark: {
    actions: {
      title: "Acciones del benchmark",
      body: "Cancela un benchmark en curso, vuelve a analizar las transcripciones guardadas tras cambiar precios o exporta los resultados como CSV o JSON.",
    },
    highlights: {
      title: "Destacados",
      body: "Las variantes más barata, más rápida y más compleja de un vistazo, y lo que ha costado el benchmark hasta ahora.",
    },
    tabs: {
      title: "Analiza los resultados",
      body: "Resultados ordena las variantes, Gráficos muestra los compromisos, Comparar enseña las respuestas lado a lado y Ejecuciones lista cada conversación.",
    },
  },
  live: {
    session: {
      title: "Habla con una variante",
      body: "Elige una variante y un escenario y habla por el micrófono. Así se mide la latencia real del audio y la calidad de la voz, algo que los benchmarks simulados no pueden.",
    },
    results: {
      title: "Resultados en vivo",
      body: "Cada llamada terminada se analiza como una ejecución de benchmark. ElevenLabs informa de su duración y coste cuando procesa la conversación.",
    },
  },
  metrics: {
    sections: {
      title: "Referencia de métricas",
      body: "Salta a un grupo: latencia, coste, complejidad, el juez LLM y cómo se agregan las ejecuciones por variante.",
    },
    complexity: {
      title: "La puntuación de complejidad",
      body: "La puntuación de 0 a 100 detrás de «Más compleja». La tabla muestra el peso de cada componente y el rango que se lleva a 0–1.",
    },
    cost: {
      title: "Reportado frente a estimado",
      body: "Las ejecuciones simuladas no tienen audio, así que su coste se estima. Las filas marcadas como «estimado» dependen de los precios de Ajustes.",
    },
  },
  settings: {
    pricing: {
      title: "Precios",
      body: "Tu plan de ElevenLabs y el precio del crédito. El coste por minuto y las estimaciones salen de estos números; compruébalos con tu plan.",
    },
    llms: {
      title: "Precios de LLM",
      body: "USD por millón de tokens para cada modelo. Estos modelos también llenan el selector de LLM de la página de variantes.",
    },
    agents: {
      title: "Mantenimiento",
      body: "Los benchmarks crean agentes en tu cuenta de ElevenLabs con el prefijo «bench-». Limpia aquí los que sobren; los demás agentes nunca se tocan.",
    },
  },
};

const fr: typeof en = {
  home: {
    welcome: {
      title: "Bienvenue dans Agent Bench",
      body: "Comparez des configurations d'agents ElevenLabs (LLM × modèle TTS × voix) selon la complexité des réponses, la latence et le coût par minute. Cette courte visite présente chaque section.",
    },
    variants: {
      title: "1. Variantes",
      body: "Une variante est une configuration d'agent : un LLM, un modèle TTS et une voix. Créez-en une par combinaison à comparer.",
    },
    scenarios: {
      title: "2. Scénarios",
      body: "Un scénario est la conversation jouée par chaque variante : le prompt système de l'agent, son premier message et un utilisateur simulé. Partez d'un modèle ou générez-en un avec l'IA.",
    },
    benchmarks: {
      title: "3. Benchmarks",
      body: "Un benchmark fait jouer chaque scénario sélectionné à chaque variante sélectionnée et classe les résultats. Vous les retrouverez tous ici.",
    },
    live: {
      title: "En direct",
      body: "Parlez vous-même à une variante avec votre micro. La session est mesurée et notée comme une exécution de benchmark.",
    },
    metrics: {
      title: "Métriques",
      body: "Comment la latence, le coût, la complexité et les notes du juge sont calculés, et où chacun peut induire en erreur. À lire avant de se fier à un classement.",
    },
    settings: {
      title: "Réglages",
      body: "Les prix utilisés pour les estimations de coût : votre forfait ElevenLabs et les prix des tokens des LLM. Vérifiez-les avec votre compte.",
    },
    language: {
      title: "Langue",
      body: "Passez l'interface en anglais, espagnol ou français. La langue de chaque scénario se choisit séparément.",
    },
    newBenchmark: {
      title: "Lancer un benchmark",
      body: "Dès que vous avez au moins une variante et un scénario, commencez ici. Une estimation du coût s'affiche avant toute exécution.",
    },
    tourButton: {
      title: "Besoin d'un rappel ?",
      body: "Chaque page a sa propre courte visite. Cliquez sur ce bouton pour la relancer à tout moment.",
    },
  },
  variants: {
    form: {
      title: "Créer une variante",
      body: "Choisissez un LLM, un modèle TTS et une voix. Le nom est libre ; indiquez-y les choix clés pour que les résultats soient faciles à lire.",
    },
    advanced: {
      title: "Réglages avancés",
      body: "Température, nombre maximal de tokens et réglages de voix facultatifs. Laissez-les vides pour utiliser les valeurs par défaut d'ElevenLabs.",
    },
    list: {
      title: "Vos variantes",
      body: "Modifiez, dupliquez ou supprimez vos variantes ici. Dupliquer est le moyen le plus rapide de changer un seul élément et de comparer.",
    },
  },
  scenarios: {
    templates: {
      title: "Partir d'un modèle",
      body: "Service client, réservation au restaurant ou rendez-vous médical, en anglais, espagnol ou français. Le modèle remplit le formulaire ; rien n'est enregistré avant l'envoi.",
    },
    generate: {
      title: "Générer avec l'IA",
      body: "Décrivez le cas d'usage en une phrase et obtenez un prompt système et un premier message de style oral à relire. Nécessite les réglages JUDGE_*.",
    },
    agent: {
      title: "L'agent",
      body: "Le prompt système définit le rôle, le ton et les limites de l'agent. Le premier message est ce qu'il dit au début de l'appel.",
    },
    user: {
      title: "L'utilisateur simulé",
      body: "Les répliques scriptées sont dites dans le même ordre pour chaque variante, ce qui donne la comparaison la plus équitable. Un persona laisse un LLM improviser l'appelant.",
    },
    list: {
      title: "Vos scénarios",
      body: "Les scénarios enregistrés apparaissent ici, prêts à être choisis lors de la création d'un benchmark.",
    },
  },
  newBenchmark: {
    picks: {
      title: "Choisir quoi comparer",
      body: "Chaque variante sélectionnée joue chaque scénario sélectionné. Sélectionnez-en au moins un de chaque.",
    },
    summary: {
      title: "Vérifier le nombre d'exécutions",
      body: "Les répétitions lissent le bruit de latence. Le juge note la qualité des réponses s'il est configuré. Une estimation du coût vous sera ensuite demandée pour confirmer.",
    },
  },
  benchmark: {
    actions: {
      title: "Actions du benchmark",
      body: "Annulez un benchmark en cours, réanalysez les transcriptions après un changement de prix ou exportez les résultats en CSV ou JSON.",
    },
    highlights: {
      title: "Points clés",
      body: "Les variantes la moins chère, la plus rapide et la plus complexe en un coup d'œil, ainsi que le coût du benchmark jusqu'ici.",
    },
    tabs: {
      title: "Explorer les résultats",
      body: "Résultats classe les variantes, Graphiques montre les compromis, Comparer affiche les réponses côte à côte et Exécutions liste chaque conversation.",
    },
  },
  live: {
    session: {
      title: "Parler à une variante",
      body: "Choisissez une variante et un scénario, puis parlez dans votre micro. Cela mesure la latence audio réelle et la qualité de la voix, ce que les benchmarks simulés ne peuvent pas faire.",
    },
    results: {
      title: "Résultats en direct",
      body: "Chaque appel terminé est analysé comme une exécution de benchmark. ElevenLabs indique sa durée et son coût une fois la conversation traitée.",
    },
  },
  metrics: {
    sections: {
      title: "Référence des métriques",
      body: "Accédez à un groupe : latence, coût, complexité, le juge LLM et l'agrégation des exécutions par variante.",
    },
    complexity: {
      title: "Le score de complexité",
      body: "Le score de 0 à 100 derrière « La plus complexe ». Le tableau montre le poids de chaque composante et la plage ramenée sur 0–1.",
    },
    cost: {
      title: "Déclaré ou estimé",
      body: "Les exécutions simulées n'ont pas d'audio, leur coût est donc estimé. Les lignes marquées « estimé » dépendent des prix des Réglages.",
    },
  },
  settings: {
    pricing: {
      title: "Tarifs",
      body: "Votre forfait ElevenLabs et le prix du crédit. Le coût par minute et les estimations viennent de ces chiffres ; vérifiez-les avec votre forfait.",
    },
    llms: {
      title: "Prix des LLM",
      body: "USD par million de tokens pour chaque modèle. Ces modèles alimentent aussi le sélecteur de LLM de la page des variantes.",
    },
    agents: {
      title: "Maintenance",
      body: "Les benchmarks créent des agents dans votre compte ElevenLabs avec le préfixe « bench- ». Nettoyez ici les restes ; les autres agents ne sont jamais touchés.",
    },
  },
};

export const tours = { en, es, fr };
