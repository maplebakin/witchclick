export const sections = [
  {
    type: "crystal",
    title: "The Crystal Index",
    subtitle: "Resonant stones and whispering gems.",
    href: "/entities/crystal",
    icon: "🔮",
  },
  {
    type: "herb",
    title: "The Herbal Lexicon",
    subtitle: "Greens that heal, hush, and ignite.",
    href: "/entities/herb",
    icon: "🌿",
  },
  {
    type: "moonPhase",
    title: "Moonlit Phases",
    subtitle: "The rhythm of the sky’s turning face.",
    href: "/entities/moonphase",
    icon: "🌙",
  },
  {
    type: "ritual",
    title: "The Ritual Archive",
    subtitle: "Practices for presence, power, and peace.",
    href: "/entities/ritual",
    icon: "🕯️",
  },
  {
    type: "tarot",
    title: "The Arcana Directory",
    subtitle: "The cards and spreads that speak in signs.",
    href: "/entities/tarot",
    icon: "🃏",
  },
] as const;

export type SectionType = (typeof sections)[number]["type"];
