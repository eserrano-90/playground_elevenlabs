type Item = { name: string; body: string };
type Assumptions = { agentChars: number; userChars: number; outputTokens: number };
type Criterion = "relevance" | "depth" | "coherence" | "adherence";

const en = {
  title: "How metrics are computed",
  description:
    "Every number in the results tables comes from the stored transcript of a run. This page explains what each metric measures, how it's calculated and where it can mislead.",
  sectionsLabel: "Metric sections",
  sections: {
    latency: "Latency",
    cost: "Cost",
    complexity: "Complexity",
    judge: "LLM judge",
    aggregation: "Aggregation",
  },
  latency: {
    description: "How long the agent takes to start answering.",
    turn: {
      name: "Turn latency",
      body: "For each agent turn: **LLM time to first byte + TTS time to first byte**, as reported by ElevenLabs in the turn metrics. If only one of the two is reported, that one is used. Turns without either are skipped.",
    } as Item,
    mean: {
      name: "Latency mean",
      body: "Average turn latency across the agent turns of a run. Good for comparing typical responsiveness.",
    } as Item,
    p95: {
      name: "Latency p95",
      body: "95th percentile of turn latency (linear interpolation). The slow turns a caller notices; with few turns it is close to the maximum.",
    } as Item,
    note: "It measures time to the first audio byte, not network round trip or turn-taking delay. Use Live runs for real audio latency, and repetitions to smooth out noise.",
  },
  cost: {
    description: "What a conversation costs, in USD.",
    run: {
      name: "Run cost",
      body: "Resolved in order: the USD cost ElevenLabs reports for the conversation, then reported credits × your USD per credit, and otherwise an estimate: **minutes × plan rate per minute + LLM cost**.",
    } as Item,
    llm: {
      name: "LLM cost",
      body: "The LLM charge ElevenLabs reports, else the per-turn token prices, else tokens × the model's price in Settings (USD per million input/output tokens). With no token counts at all, tokens are approximated as characters ÷ 4.",
    } as Item,
    perMin: {
      name: "Cost / min",
      body: "Run cost ÷ conversation duration in minutes. Simulated runs have no audio, so their duration is estimated as all characters ÷ the TTS model's speech rate (characters per second, set in Settings).",
    } as Item,
    perRun: {
      name: "Cost / run",
      body: "Total cost of one conversation. Cost per agent turn is also stored and exported.",
    } as Item,
    estimatedBadge:
      "Shown when any run in the row used the estimate instead of a figure reported by ElevenLabs.",
    note: (a: Assumptions) =>
      `The pre-run estimate assumes ${a.agentChars} characters per agent turn, ${a.userChars} per user turn and ${a.outputTokens} output tokens per turn, with the scenario running to its max turns. Real runs usually end earlier.`,
  },
  complexity: {
    description:
      "How elaborate the agent's language is. Computed over all agent text of a run joined together, because readability formulas are unreliable on short single turns.",
    words: {
      name: "Words / response",
      body: "Total agent words ÷ agent turns. Voice agents usually aim for short answers.",
    } as Item,
    sentence: {
      name: "Sentence length",
      body: "Words per sentence. Sentences split on . ! ? … and line breaks.",
    } as Item,
    readability: {
      name: "Readability",
      body: "Depends on the scenario language. **English:** Flesch–Kincaid grade level, where higher = harder (roughly a US school grade). **Spanish:** Fernández-Huerta reading ease, 0–100 where higher = *easier*. **French:** Kandel–Moles reading ease, 0–100 where higher = *easier*. Syllables are counted with heuristics, so treat values as approximate and compare them only within one language.",
    } as Item,
    lexical: {
      name: "Lexical diversity",
      body: (window: number) =>
        `Moving-average type-token ratio (MATTR, window ${window} words): the share of distinct words in each window, averaged. Higher = more varied vocabulary. Unlike the plain type-token ratio, it doesn't fall just because the text is longer.`,
    },
    score: {
      name: "Complexity score",
      body: "Weighted composite. Each metric is mapped linearly onto a fixed reference range and clamped to 0–1, so scores stay comparable across benchmarks. Without a judge score, the remaining weights are renormalized.",
    } as Item,
    table: { component: "Component", weight: "Weight", mapsTo: "Maps to 0 → 1" },
    rows: {
      words: "Words per response",
      sentence: "Sentence length (words)",
      readability: "Readability",
      lexical: "Lexical diversity (MATTR)",
      judge: "Judge (depth + coherence)",
    },
    readabilityRange: (en: string, es: string, fr: string) =>
      `EN grade ${en} · ES ease ${es} · FR ease ${fr}`,
    note: "Higher complexity isn't better. For voice, simple and short is often the goal; use it to spot variants that ramble.",
  },
  judge: {
    description:
      "Optional quality scores from a separate LLM (`JUDGE_*` settings), run at temperature 0 on the transcript and the agent's system prompt.",
    criterion: "Criterion",
    scale: "Scores 1 (very poor) to 5 (excellent)",
    criteria: {
      relevance: { name: "Relevance", body: "Responses address what the user actually asked." },
      depth: {
        name: "Depth",
        body: "Substantive, informative content rather than generic filler.",
      },
      coherence: {
        name: "Coherence",
        body: "Logically organized, consistent and easy to follow when spoken aloud.",
      },
      adherence: {
        name: "Adherence",
        body: "Follows the agent's system prompt: role, constraints, tone and language.",
      },
    } as Record<Criterion, Item>,
    mean: {
      name: "Judge (1–5)",
      body: "Mean of the four criteria. Each run page shows a one-sentence rationale per criterion.",
    } as Item,
    note: "Only depth and coherence feed the complexity score; relevance and adherence measure quality, not complexity. If the judge fails, the run still completes with deterministic metrics only.",
  },
  aggregation: {
    description: "How runs become one row per variant.",
    perVariant: {
      name: "Per variant",
      body: "Only completed runs count. Each metric is averaged over the runs of a variant, across all scenarios or the one selected in the scenario filter.",
    } as Item,
    spread: {
      name: "Spread",
      body: "CSV exports add min, max and sample standard deviation per metric. Large spread means you need more repetitions before trusting a ranking.",
    } as Item,
    highlights: {
      name: "Highlights",
      body: "Cheapest = lowest mean cost per minute, fastest = lowest mean latency, most complex = highest mean complexity score.",
    } as Item,
  },
};

const es: typeof en = {
  title: "Cómo se calculan las métricas",
  description:
    "Cada número de las tablas de resultados sale de la transcripción guardada de una ejecución. Esta página explica qué mide cada métrica, cómo se calcula y dónde puede engañar.",
  sectionsLabel: "Secciones de métricas",
  sections: {
    latency: "Latencia",
    cost: "Coste",
    complexity: "Complejidad",
    judge: "Juez LLM",
    aggregation: "Agregación",
  },
  latency: {
    description: "Cuánto tarda el agente en empezar a responder.",
    turn: {
      name: "Latencia por turno",
      body: "Para cada turno del agente: **tiempo hasta el primer byte del LLM + tiempo hasta el primer byte del TTS**, según las métricas de turno de ElevenLabs. Si solo se informa uno de los dos, se usa ese. Los turnos sin ninguno se omiten.",
    },
    mean: {
      name: "Latencia media",
      body: "Media de la latencia por turno en los turnos del agente de una ejecución. Útil para comparar la respuesta típica.",
    },
    p95: {
      name: "Latencia p95",
      body: "Percentil 95 de la latencia por turno (interpolación lineal). Los turnos lentos que nota quien llama; con pocos turnos se acerca al máximo.",
    },
    note: "Mide el tiempo hasta el primer byte de audio, no la ida y vuelta de red ni el retardo de toma de turno. Usa las ejecuciones en vivo para la latencia real del audio y las repeticiones para suavizar el ruido.",
  },
  cost: {
    description: "Lo que cuesta una conversación, en USD.",
    run: {
      name: "Coste por ejecución",
      body: "Se resuelve en orden: el coste en USD que ElevenLabs informa para la conversación, después los créditos informados × tu USD por crédito y, si no, una estimación: **minutos × tarifa por minuto del plan + coste del LLM**.",
    },
    llm: {
      name: "Coste del LLM",
      body: "El cargo del LLM que informa ElevenLabs; si no, los precios por token de cada turno; si no, tokens × el precio del modelo en Ajustes (USD por millón de tokens de entrada/salida). Sin ningún recuento de tokens, se aproximan como caracteres ÷ 4.",
    },
    perMin: {
      name: "Coste / min",
      body: "Coste de la ejecución ÷ duración de la conversación en minutos. Las ejecuciones simuladas no tienen audio, así que su duración se estima como todos los caracteres ÷ la velocidad de habla del modelo TTS (caracteres por segundo, en Ajustes).",
    },
    perRun: {
      name: "Coste / ejecución",
      body: "Coste total de una conversación. El coste por turno del agente también se guarda y se exporta.",
    },
    estimatedBadge:
      "Aparece cuando alguna ejecución de la fila usó la estimación en lugar de una cifra informada por ElevenLabs.",
    note: (a) =>
      `La estimación previa supone ${a.agentChars} caracteres por turno del agente, ${a.userChars} por turno del usuario y ${a.outputTokens} tokens de salida por turno, con el escenario llegando a su máximo de turnos. Las ejecuciones reales suelen terminar antes.`,
  },
  complexity: {
    description:
      "Lo elaborado que es el lenguaje del agente. Se calcula sobre todo el texto del agente de una ejecución unido, porque las fórmulas de legibilidad no son fiables en turnos cortos sueltos.",
    words: {
      name: "Palabras / respuesta",
      body: "Total de palabras del agente ÷ turnos del agente. Los agentes de voz suelen buscar respuestas cortas.",
    },
    sentence: {
      name: "Longitud de frase",
      body: "Palabras por frase. Las frases se separan en . ! ? … y saltos de línea.",
    },
    readability: {
      name: "Legibilidad",
      body: "Depende del idioma del escenario. **Inglés:** nivel de grado Flesch–Kincaid, donde más alto = más difícil (aprox. un curso escolar de EE. UU.). **Español:** facilidad de lectura Fernández-Huerta, de 0 a 100, donde más alto = *más fácil*. **Francés:** facilidad de lectura Kandel–Moles, de 0 a 100, donde más alto = *más fácil*. Las sílabas se cuentan con heurísticas: toma los valores como aproximados y compáralos solo dentro de un mismo idioma.",
    },
    lexical: {
      name: "Diversidad léxica",
      body: (window) =>
        `Ratio tipo-token de media móvil (MATTR, ventana de ${window} palabras): la proporción de palabras distintas en cada ventana, promediada. Más alto = vocabulario más variado. A diferencia del ratio tipo-token simple, no baja solo porque el texto sea más largo.`,
    },
    score: {
      name: "Puntuación de complejidad",
      body: "Compuesto ponderado. Cada métrica se lleva linealmente a un rango de referencia fijo y se limita a 0–1, para que las puntuaciones sean comparables entre benchmarks. Sin puntuación del juez, los pesos restantes se renormalizan.",
    },
    table: { component: "Componente", weight: "Peso", mapsTo: "Se lleva a 0 → 1" },
    rows: {
      words: "Palabras por respuesta",
      sentence: "Longitud de frase (palabras)",
      readability: "Legibilidad",
      lexical: "Diversidad léxica (MATTR)",
      judge: "Juez (profundidad + coherencia)",
    },
    readabilityRange: (en, es, fr) => `EN grado ${en} · ES facilidad ${es} · FR facilidad ${fr}`,
    note: "Más complejidad no es mejor. En voz, lo simple y breve suele ser el objetivo; úsala para detectar variantes que se enrollan.",
  },
  judge: {
    description:
      "Puntuaciones de calidad opcionales de un LLM aparte (ajustes `JUDGE_*`), a temperatura 0 sobre la transcripción y el prompt de sistema del agente.",
    criterion: "Criterio",
    scale: "Puntúa de 1 (muy malo) a 5 (excelente)",
    criteria: {
      relevance: {
        name: "Relevancia",
        body: "Las respuestas atienden lo que el usuario preguntó de verdad.",
      },
      depth: {
        name: "Profundidad",
        body: "Contenido sustancial e informativo en lugar de relleno genérico.",
      },
      coherence: {
        name: "Coherencia",
        body: "Organizado con lógica, consistente y fácil de seguir en voz alta.",
      },
      adherence: {
        name: "Adherencia",
        body: "Sigue el prompt de sistema del agente: papel, restricciones, tono e idioma.",
      },
    },
    mean: {
      name: "Juez (1–5)",
      body: "Media de los cuatro criterios. Cada página de ejecución muestra una justificación de una frase por criterio.",
    },
    note: "Solo la profundidad y la coherencia alimentan la puntuación de complejidad; la relevancia y la adherencia miden calidad, no complejidad. Si el juez falla, la ejecución se completa igualmente solo con métricas deterministas.",
  },
  aggregation: {
    description: "Cómo las ejecuciones se convierten en una fila por variante.",
    perVariant: {
      name: "Por variante",
      body: "Solo cuentan las ejecuciones completadas. Cada métrica se promedia sobre las ejecuciones de una variante, en todos los escenarios o en el elegido en el filtro de escenarios.",
    },
    spread: {
      name: "Dispersión",
      body: "Las exportaciones CSV añaden mínimo, máximo y desviación típica muestral por métrica. Mucha dispersión significa que necesitas más repeticiones antes de fiarte de una clasificación.",
    },
    highlights: {
      name: "Destacados",
      body: "Más barata = menor coste medio por minuto, más rápida = menor latencia media, más compleja = mayor puntuación de complejidad media.",
    },
  },
};

const fr: typeof en = {
  title: "Comment les métriques sont calculées",
  description:
    "Chaque chiffre des tableaux de résultats vient de la transcription enregistrée d'une exécution. Cette page explique ce que mesure chaque métrique, comment elle est calculée et où elle peut induire en erreur.",
  sectionsLabel: "Sections des métriques",
  sections: {
    latency: "Latence",
    cost: "Coût",
    complexity: "Complexité",
    judge: "Juge LLM",
    aggregation: "Agrégation",
  },
  latency: {
    description: "Le temps que met l'agent à commencer à répondre.",
    turn: {
      name: "Latence par tour",
      body: "Pour chaque tour de l'agent : **temps jusqu'au premier octet du LLM + temps jusqu'au premier octet du TTS**, tels que rapportés par ElevenLabs dans les métriques de tour. Si un seul des deux est fourni, c'est celui-là qui est utilisé. Les tours sans aucun des deux sont ignorés.",
    },
    mean: {
      name: "Latence moyenne",
      body: "Moyenne de la latence par tour sur les tours de l'agent d'une exécution. Utile pour comparer la réactivité habituelle.",
    },
    p95: {
      name: "Latence p95",
      body: "95e centile de la latence par tour (interpolation linéaire). Les tours lents que l'appelant remarque ; avec peu de tours, il est proche du maximum.",
    },
    note: "Elle mesure le temps jusqu'au premier octet audio, pas l'aller-retour réseau ni le délai de prise de parole. Utilisez les exécutions en direct pour la latence audio réelle, et les répétitions pour lisser le bruit.",
  },
  cost: {
    description: "Ce que coûte une conversation, en USD.",
    run: {
      name: "Coût d'exécution",
      body: "Déterminé dans l'ordre : le coût en USD déclaré par ElevenLabs pour la conversation, puis les crédits déclarés × votre prix en USD par crédit, et sinon une estimation : **minutes × tarif par minute du forfait + coût du LLM**.",
    },
    llm: {
      name: "Coût du LLM",
      body: "Le montant LLM déclaré par ElevenLabs, sinon les prix par token de chaque tour, sinon tokens × le prix du modèle dans les Réglages (USD par million de tokens d'entrée/sortie). Sans aucun décompte de tokens, ils sont estimés à caractères ÷ 4.",
    },
    perMin: {
      name: "Coût / min",
      body: "Coût d'exécution ÷ durée de la conversation en minutes. Les exécutions simulées n'ont pas d'audio : leur durée est estimée à l'ensemble des caractères ÷ le débit de parole du modèle TTS (caractères par seconde, dans les Réglages).",
    },
    perRun: {
      name: "Coût / exécution",
      body: "Coût total d'une conversation. Le coût par tour de l'agent est aussi enregistré et exporté.",
    },
    estimatedBadge:
      "Affiché quand une exécution de la ligne a utilisé l'estimation au lieu d'un chiffre déclaré par ElevenLabs.",
    note: (a) =>
      `L'estimation préalable suppose ${a.agentChars} caractères par tour de l'agent, ${a.userChars} par tour de l'utilisateur et ${a.outputTokens} tokens de sortie par tour, le scénario allant jusqu'à son nombre maximal de tours. Les exécutions réelles se terminent généralement plus tôt.`,
  },
  complexity: {
    description:
      "Le degré d'élaboration du langage de l'agent. Calculé sur tout le texte de l'agent d'une exécution mis bout à bout, car les formules de lisibilité sont peu fiables sur des tours courts isolés.",
    words: {
      name: "Mots / réponse",
      body: "Total des mots de l'agent ÷ tours de l'agent. Les agents vocaux visent en général des réponses courtes.",
    },
    sentence: {
      name: "Longueur de phrase",
      body: "Mots par phrase. Les phrases sont découpées sur . ! ? … et les retours à la ligne.",
    },
    readability: {
      name: "Lisibilité",
      body: "Dépend de la langue du scénario. **Anglais :** niveau scolaire Flesch–Kincaid, plus haut = plus difficile (environ une classe aux États-Unis). **Espagnol :** facilité de lecture Fernández-Huerta, de 0 à 100, plus haut = *plus facile*. **Français :** facilité de lecture Kandel–Moles, de 0 à 100, plus haut = *plus facile*. Les syllabes sont comptées par heuristique : considérez les valeurs comme approximatives et ne les comparez qu'au sein d'une même langue.",
    },
    lexical: {
      name: "Diversité lexicale",
      body: (window) =>
        `Ratio types/occurrences en moyenne mobile (MATTR, fenêtre de ${window} mots) : la part de mots distincts dans chaque fenêtre, moyennée. Plus haut = vocabulaire plus varié. Contrairement au ratio simple, il ne baisse pas du seul fait que le texte est plus long.`,
    },
    score: {
      name: "Score de complexité",
      body: "Composite pondéré. Chaque métrique est ramenée linéairement sur une plage de référence fixe et bornée à 0–1, pour que les scores restent comparables d'un benchmark à l'autre. Sans note du juge, les poids restants sont renormalisés.",
    },
    table: { component: "Composante", weight: "Poids", mapsTo: "Ramené sur 0 → 1" },
    rows: {
      words: "Mots par réponse",
      sentence: "Longueur de phrase (mots)",
      readability: "Lisibilité",
      lexical: "Diversité lexicale (MATTR)",
      judge: "Juge (profondeur + cohérence)",
    },
    readabilityRange: (en, es, fr) => `EN niveau ${en} · ES facilité ${es} · FR facilité ${fr}`,
    note: "Plus de complexité n'est pas mieux. À l'oral, simple et court est souvent le but ; servez-vous-en pour repérer les variantes trop bavardes.",
  },
  judge: {
    description:
      "Notes de qualité facultatives données par un LLM distinct (réglages `JUDGE_*`), à température 0, sur la transcription et le prompt système de l'agent.",
    criterion: "Critère",
    scale: "Note de 1 (très mauvais) à 5 (excellent)",
    criteria: {
      relevance: {
        name: "Pertinence",
        body: "Les réponses traitent ce que l'utilisateur a réellement demandé.",
      },
      depth: {
        name: "Profondeur",
        body: "Un contenu substantiel et informatif plutôt que du remplissage générique.",
      },
      coherence: {
        name: "Cohérence",
        body: "Organisé logiquement, cohérent et facile à suivre à l'oral.",
      },
      adherence: {
        name: "Respect des consignes",
        body: "Suit le prompt système de l'agent : rôle, contraintes, ton et langue.",
      },
    },
    mean: {
      name: "Juge (1–5)",
      body: "Moyenne des quatre critères. Chaque page d'exécution affiche une justification d'une phrase par critère.",
    },
    note: "Seules la profondeur et la cohérence entrent dans le score de complexité ; la pertinence et le respect des consignes mesurent la qualité, pas la complexité. Si le juge échoue, l'exécution se termine quand même avec les seules métriques déterministes.",
  },
  aggregation: {
    description: "Comment les exécutions deviennent une ligne par variante.",
    perVariant: {
      name: "Par variante",
      body: "Seules les exécutions terminées comptent. Chaque métrique est moyennée sur les exécutions d'une variante, sur tous les scénarios ou sur celui choisi dans le filtre de scénario.",
    },
    spread: {
      name: "Dispersion",
      body: "Les exports CSV ajoutent le min, le max et l'écart type d'échantillon par métrique. Une forte dispersion signifie qu'il faut plus de répétitions avant de se fier à un classement.",
    },
    highlights: {
      name: "Points clés",
      body: "La moins chère = coût moyen par minute le plus bas, la plus rapide = latence moyenne la plus basse, la plus complexe = score de complexité moyen le plus élevé.",
    },
  },
};

export const metrics = { en, es, fr };
