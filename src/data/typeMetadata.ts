export type TypeMetadataEntry = {
  label?: string;
  pluralLabel?: string;
  emoji?: string;
  slug?: string;
  title: string;
  subtitle: string;
  description?: string;
  introText: string;
  icon: string;
  themeColor: string;
  stubLine: string;
  cardStyleClass?: string;
};

const defaultMetadata: TypeMetadataEntry = {
  title: "The Grimoire", 
  subtitle: "A symbolic reference entry waiting for context.",
  introText:
    "Every grimoire entry is a reference point, not an authority. Return soon for language, correspondences, and reflection prompts you can use as a chosen lens.",
  icon: "✨",
  themeColor: "violet-500",
  stubLine: "This page is still gathering its notes.",
  cardStyleClass: "from-gradient-default-start/20 to-gradient-default-end/40",
};

export const typeMetadata = {
  crystal: {
    title: "The Crystal Index",
    subtitle: "Stones as tactile symbols, anchors, and prompts.",
    introText:
      "Use crystal correspondences as sensory language: color, texture, folklore, and association shaped into reflective anchors for rituals and journaling.",
    icon: "🔮",
    themeColor: "violet-500",
    stubLine: "This crystal entry is still being shaped.",
    cardStyleClass: "from-gradient-crystal-start/30 to-gradient-crystal-end/40",
  },
  herb: {
    title: "The Herbal Lexicon",
    subtitle: "Plant correspondences for attention, care, and ritual structure.",
    introText:
      "Browse herbs as practical and symbolic companions: scent, taste, history, and sensory association arranged into grounded ritual cues.",
    icon: "🌿",
    themeColor: "emerald-500",
    stubLine: "This herb entry is still rooting into the index.",
    cardStyleClass: "from-gradient-herb-start/30 to-gradient-herb-end/40",
  },
  moonPhase: {
    label: "Moon Phase",
    pluralLabel: "Moon Phases",
    emoji: "🌙",
    slug: "moonPhase",
    title: "Moonlit Phases",
    subtitle: "A visible cycle for timing, reflection, and perspective.",
    description: "A visible cycle for timing, reflection, and perspective.",
    introText:
      "Use moon phases as a calendar lens: a simple way to frame beginnings, fullness, release, rest, and review without treating the sky as a command.",
    icon: "🌙",
    themeColor: "sky-400",
    stubLine: "This moon phase entry is still collecting its notes.",
    cardStyleClass: "from-gradient-moon-start/30 to-gradient-moon-end/40",
  },
  planet: {
    label: "Planet",
    pluralLabel: "Planets",
    emoji: "🪐",
    slug: "planet",
    title: "The Celestial Bodies",
    subtitle:
      "The planets are not fortune tellers. They are mirrors for different qualities of attention.",
    description:
      "The planets are not fortune tellers. They are mirrors for different qualities of attention.",
    introText:
      "Use planetary symbolism as a set of lenses for attention: drive, care, communication, constraint, expansion, and the patterns you choose to notice.",
    icon: "🪐",
    themeColor: "indigo-500",
    stubLine: "This celestial body entry is still gathering its references.",
    cardStyleClass: "from-gradient-default-start/20 to-gradient-default-end/40",
  },
  planetaryDay: {
    label: "Planetary Day",
    pluralLabel: "Planetary Days",
    emoji: "🪐",
    slug: "planetaryDay",
    title: "Planetary Day Almanac",
    subtitle: "Weekday rhythms for intention and timing.",
    description: "Weekday rhythms for intention and timing.",
    introText:
      "Use planetary days as optional structure for planning, focus, release, and reflection. The correspondence gives the day a lens; you decide whether it fits.",
    icon: "🪐",
    themeColor: "indigo-500",
    stubLine: "This planetary day is still collecting its correspondences.",
    cardStyleClass: "from-gradient-default-start/20 to-gradient-default-end/40",
  },
  ritual: {
    title: "The Ritual Archive",
    subtitle: "Repeatable structures for attention, refusal, care, and change.",
    introText:
      "Browse rituals as chosen structures: small sequences of action, language, and attention that help you mark a threshold and decide how to meet it.",
    icon: "🕯️",
    themeColor: "amber-500",
    stubLine: "This ritual entry is still being outlined.",
    cardStyleClass: "from-gradient-ritual-start/30 to-gradient-ritual-end/40",
  },
  tarot: {
    label: "Tarot",
    pluralLabel: "Tarot",
    emoji: "🃏",
    slug: "tarot",
    title: "The Arcana Directory",
    subtitle:
      "78 cards as archetypes, questions, contrasts, and mirrors.",
    description:
      "78 cards as archetypes, questions, contrasts, and mirrors.",
    introText:
      "Use tarot as pattern-reading, not prediction. Each card offers symbolic language for naming tensions, testing perspectives, and choosing a next question.",
    icon: "🃏",
    themeColor: "violet-600",
    stubLine: "This card entry is still being written.",
    cardStyleClass: "from-gradient-tarot-start/30 to-gradient-tarot-end/40",
  },
  spread: {
    label: "Spread",
    pluralLabel: "Spreads",
    emoji: "🪄",
    slug: "spread",
    title: "The Spread Library",
    subtitle: "Layouts for reflection, pattern reading, and play.",
    description: "Layouts for reflection, pattern reading, and play.",
    introText:
      "Explore card layouts designed to surface patterns, questions, tensions, and next steps. A spread is a frame for attention, not a verdict.",
    icon: "🪄",
    themeColor: "amber-500",
    stubLine: "This spread is still arranging its prompts.",
    cardStyleClass: "from-gradient-ritual-start/30 to-gradient-ritual-end/40",
  },
} satisfies Record<string, TypeMetadataEntry>;

export type TypeMetadata = typeof typeMetadata;

export const getTypeMetadata = (type: string): TypeMetadataEntry => {
  return typeMetadata[type as keyof TypeMetadata] ?? defaultMetadata;
};

export const sections = Object.entries(typeMetadata).map(([type, metadata]) => ({
  type,
  title: metadata.title,
  subtitle: metadata.subtitle,
  icon: metadata.icon,
  href: `/entities/${type}`,
  themeColor: metadata.themeColor,
}));
