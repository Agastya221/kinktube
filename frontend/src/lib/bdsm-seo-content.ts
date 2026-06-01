export interface FaqItem {
  question: string;
  answer: string;
}

export interface QuizAnswer {
  label: string;
  description: string;
  scores: Record<string, number>;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  answers: QuizAnswer[];
}

export interface QuizResult {
  id: string;
  title: string;
  summary: string;
  categoryHref: string;
  categoryLabel: string;
  traits: string[];
}

export const bdsmGuideLinks = [
  { href: "/bdsm-meaning", label: "BDSM meaning" },
  { href: "/bdsm-test", label: "BDSM test" },
  { href: "/category/bdsm", label: "BDSM videos" },
  { href: "/category/bondage", label: "Bondage" },
  { href: "/category/femdom", label: "Femdom" },
  { href: "/category/shibari", label: "Shibari" },
  { href: "/category/submission", label: "Submission" },
];

export const bdsmMeaningFaqs: FaqItem[] = [
  {
    question: "What is BDSM?",
    answer:
      "BDSM is an umbrella term for consensual adult interests around bondage and discipline, dominance and submission, and sadism and masochism. It can describe fantasy, roleplay, relationship dynamics, erotic media, or private adult activities.",
  },
  {
    question: "What does BDSM stand for?",
    answer:
      "BDSM is commonly expanded as bondage and discipline, dominance and submission, and sadism and masochism. The letters overlap because BDSM covers several related kink and power-exchange interests rather than one single act.",
  },
  {
    question: "What does BDSM mean?",
    answer:
      "BDSM means consensual adult kink built around restraint, control, sensation, rules, trust, and negotiated roles. The exact meaning changes by person: some people focus on bondage, some on dominance and submission, and others on fetish style or sensation play.",
  },
  {
    question: "What is a rigger in BDSM?",
    answer:
      "A rigger is someone who ties, restrains, or suspends a consenting adult partner using rope or other bondage methods. Good rigging depends on communication, training, safety knowledge, and clear consent before anything begins.",
  },
  {
    question: "What is a brat in BDSM?",
    answer:
      "A brat is a submissive or switch who enjoys playful resistance, teasing, or rule-testing inside agreed boundaries. Brat dynamics still rely on consent, safewords, and respect for limits.",
  },
  {
    question: "What is CNC in BDSM?",
    answer:
      "CNC means consensual non-consent. It is adult roleplay where the people involved agree in advance to simulate resistance or loss of control. It requires explicit negotiation, safewords, aftercare, and the ability to stop at any time.",
  },
  {
    question: "What is a switch in BDSM?",
    answer:
      "A switch is someone who enjoys both dominant and submissive roles, either with different partners or in different moods. Switching is common and does not make a person's preferences less real.",
  },
  {
    question: "How do people tie safely in BDSM?",
    answer:
      "Safe tying starts with basic education, consent, circulation checks, easy release, and avoiding risky pressure on nerves, the neck, or joints. Beginners should use simple restraint ideas and learn from safety-focused rope educators before trying complex bondage.",
  },
];

export const bdsmTestFaqs: FaqItem[] = [
  {
    question: "What is a BDSM test?",
    answer:
      "A BDSM test or BDSM quiz is a private self-reflection tool that asks about adult kink interests and suggests possible preference areas, such as bondage, dominance and submission, sensation play, or fetish style.",
  },
  {
    question: "Is this BDSM test saved anywhere?",
    answer:
      "No. This quiz runs in your browser and does not send your answers to the KinkTube backend. Your result is calculated on the page only.",
  },
  {
    question: "Is a BDSM quiz the same as a diagnosis?",
    answer:
      "No. A BDSM quiz is only a light discovery tool. It cannot define your identity, relationship style, or boundaries. Treat the result as a starting point for private reflection and safer adult exploration.",
  },
  {
    question: "Can beginners take the BDSM test?",
    answer:
      "Yes. The questions are written for adults who are curious about BDSM terms and preferences. The result links to related KinkTube categories so users can browse broad interests without needing advanced vocabulary.",
  },
  {
    question: "Why does the quiz mention consent and limits?",
    answer:
      "Consent, limits, and communication are central to BDSM. Any adult kink interest should be negotiated clearly and stopped immediately if a boundary is crossed.",
  },
];

export const bdsmQuizResults: QuizResult[] = [
  {
    id: "bondage-curious",
    title: "Bondage-Curious Explorer",
    summary:
      "Your answers lean toward restraint, structure, and the visual tension of being tied or controlled. You may enjoy bondage, shibari, and scenes where the setup matters as much as the action.",
    categoryHref: "/category/bondage",
    categoryLabel: "Bondage videos",
    traits: ["Restraint", "Rope and gear", "Slow-build scenes"],
  },
  {
    id: "power-exchange",
    title: "Power Exchange Focus",
    summary:
      "Your strongest match is dominance and submission. You may prefer clear roles, obedience, control, service, discipline, or scenes built around who leads and who follows.",
    categoryHref: "/category/femdom",
    categoryLabel: "Femdom videos",
    traits: ["Dominance", "Submission", "Rules and control"],
  },
  {
    id: "sensation-play",
    title: "Sensation Play Seeker",
    summary:
      "Your result points toward controlled intensity, teasing, impact, and physical sensation. You may be drawn to spanking, caning, whipping, or other scenes where sensation is the main focus.",
    categoryHref: "/category/spanking",
    categoryLabel: "Spanking videos",
    traits: ["Impact play", "Teasing", "Controlled intensity"],
  },
  {
    id: "fetish-aesthetic",
    title: "Fetish Aesthetic Fan",
    summary:
      "Your answers suggest that style, atmosphere, and texture matter. Latex, leather, masks, collars, boots, or strict visual roles may be part of what makes BDSM interesting to you.",
    categoryHref: "/category/latex",
    categoryLabel: "Latex videos",
    traits: ["Latex and leather", "Visual style", "Role atmosphere"],
  },
  {
    id: "wide-explorer",
    title: "Wide BDSM Explorer",
    summary:
      "Your answers are balanced across several areas. Start with the main BDSM category, then move into more specific pages once you notice which themes keep catching your attention.",
    categoryHref: "/category/bdsm",
    categoryLabel: "BDSM videos",
    traits: ["Broad curiosity", "Mixed dynamics", "Category discovery"],
  },
];

export const bdsmQuizQuestions: QuizQuestion[] = [
  {
    id: "scene-focus",
    prompt: "Which kind of BDSM scene catches your attention first?",
    answers: [
      {
        label: "Someone restrained or tied",
        description: "Rope, cuffs, strict positions, and the look of control.",
        scores: { "bondage-curious": 3, "wide-explorer": 1 },
      },
      {
        label: "A clear dominant/submissive dynamic",
        description: "One person leads, the other follows negotiated rules.",
        scores: { "power-exchange": 3, "wide-explorer": 1 },
      },
      {
        label: "Impact, teasing, or sensation",
        description: "Spanking, discipline, pressure, or controlled intensity.",
        scores: { "sensation-play": 3, "wide-explorer": 1 },
      },
      {
        label: "The outfit and atmosphere",
        description: "Latex, leather, collars, boots, masks, and dungeon style.",
        scores: { "fetish-aesthetic": 3, "wide-explorer": 1 },
      },
    ],
  },
  {
    id: "role-preference",
    prompt: "Which role sounds most interesting in fantasy?",
    answers: [
      {
        label: "Being held in place",
        description: "The appeal is restraint, not needing to move, and surrendering control.",
        scores: { "bondage-curious": 2, "power-exchange": 1 },
      },
      {
        label: "Giving or receiving orders",
        description: "Rules, obedience, praise, correction, or service are the focus.",
        scores: { "power-exchange": 3 },
      },
      {
        label: "Trying both sides",
        description: "You might switch depending on partner, mood, or scene.",
        scores: { "wide-explorer": 3, "power-exchange": 1 },
      },
      {
        label: "Setting the mood visually",
        description: "The scene feels strongest when the styling and ritual are right.",
        scores: { "fetish-aesthetic": 3 },
      },
    ],
  },
  {
    id: "pace",
    prompt: "What pace sounds most appealing?",
    answers: [
      {
        label: "Slow and deliberate",
        description: "A scene that builds through knots, restraints, or anticipation.",
        scores: { "bondage-curious": 3 },
      },
      {
        label: "Strict and structured",
        description: "Clear roles, instructions, and consequences.",
        scores: { "power-exchange": 3 },
      },
      {
        label: "Intense but controlled",
        description: "The appeal is sensation within agreed limits.",
        scores: { "sensation-play": 3 },
      },
      {
        label: "Atmospheric and stylish",
        description: "Mood, lighting, outfits, and props do a lot of the work.",
        scores: { "fetish-aesthetic": 3 },
      },
    ],
  },
  {
    id: "limits",
    prompt: "What would make a BDSM scene feel safer to explore?",
    answers: [
      {
        label: "Quick release and simple restraints",
        description: "You want bondage that feels controlled and easy to stop.",
        scores: { "bondage-curious": 2, "wide-explorer": 1 },
      },
      {
        label: "Clear rules and a safeword",
        description: "Communication and boundaries make the dynamic work.",
        scores: { "power-exchange": 2, "wide-explorer": 1 },
      },
      {
        label: "Starting light and checking in",
        description: "You prefer sensation that ramps up gradually.",
        scores: { "sensation-play": 2, "wide-explorer": 1 },
      },
      {
        label: "Keeping it mostly visual",
        description: "The fantasy can be about style before intensity.",
        scores: { "fetish-aesthetic": 2, "wide-explorer": 1 },
      },
    ],
  },
  {
    id: "category-click",
    prompt: "Which category would you click first?",
    answers: [
      {
        label: "Bondage or Shibari",
        description: "Rope, restraints, positions, and control through restriction.",
        scores: { "bondage-curious": 3 },
      },
      {
        label: "Femdom or Submission",
        description: "Dominance, obedience, teasing, rules, and power exchange.",
        scores: { "power-exchange": 3 },
      },
      {
        label: "Spanking or Caning",
        description: "Impact play, discipline, and controlled sensation.",
        scores: { "sensation-play": 3 },
      },
      {
        label: "Latex or Chastity",
        description: "Fetish style, control symbols, and distinctive adult aesthetics.",
        scores: { "fetish-aesthetic": 3 },
      },
    ],
  },
  {
    id: "result-use",
    prompt: "What do you want the result to help with?",
    answers: [
      {
        label: "Find better bondage videos",
        description: "You want the quiz to point you toward scenes with restraint.",
        scores: { "bondage-curious": 2 },
      },
      {
        label: "Understand dom/sub interests",
        description: "You want vocabulary for power exchange and roles.",
        scores: { "power-exchange": 2 },
      },
      {
        label: "Find intensity without guessing",
        description: "You want a safer way to browse sensation-focused content.",
        scores: { "sensation-play": 2 },
      },
      {
        label: "Explore the whole BDSM map",
        description: "You are still learning what each keyword means.",
        scores: { "wide-explorer": 3 },
      },
    ],
  },
];

