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
  subtitle: "Mystic knowledge awaiting discovery.",
  introText:
    "Every entry in the WitchClick grimoire hums with latent insight. Return soon to uncover the next revelation woven between moonlight and ink.",
  icon: "✨",
  themeColor: "violet-500",
  stubLine: "This page is still gathering its energies.",
  cardStyleClass: "from-gradient-default-start/20 to-gradient-default-end/40",
};

export const typeMetadata = {
  crystal: {
    title: "The Crystal Index",
    subtitle: "Resonant stones and whispering gems.",
    introText:
      "Trace the latticework of power coiled within each crystal. From protective wards to amplifying prisms, these stones attune any ritual to its purest frequency.",
    icon: "🔮",
    themeColor: "violet-500",
    stubLine: "This crystal’s story is still faceting itself.",
    cardStyleClass: "from-gradient-crystal-start/30 to-gradient-crystal-end/40",
  },
  herb: {
    title: "The Herbal Lexicon",
    subtitle: "Greens that heal, hush, and ignite.",
    introText:
      "Gather verdant allies for teas, tinctures, and spellcraft. These herbs bend their fragrant will toward soothing hearts and stirring courageous intentions.",
    icon: "🌿",
    themeColor: "emerald-500",
    stubLine: "This herb is still rooting into the lexicon.",
    cardStyleClass: "from-gradient-herb-start/30 to-gradient-herb-end/40",
  },
  moonPhase: {
    label: "Moon Phase",
    pluralLabel: "Moon Phases",
    emoji: "🌙",
    slug: "moonPhase",
    title: "Moonlit Phases",
    subtitle: "The rhythm of the sky’s turning face.",
    description: "The rhythm of the sky’s turning face.",
    introText:
      "Chart the waxing and waning tides of lunar magic. Each phase is a compass point guiding intention, release, and the secret grammar of the night.",
    icon: "🌙",
    themeColor: "sky-400",
    stubLine: "This moon phase is still revealing its glow.",
    cardStyleClass: "from-gradient-moon-start/30 to-gradient-moon-end/40",
  },
  planet: {
    label: "Planet",
    pluralLabel: "Planets",
    emoji: "🪐",
    slug: "planet",
    title: "The Celestial Bodies",
    subtitle:
      "The planets are not fortune tellers. They are mirrors — each one reflecting a different quality of attention back at you.",
    description:
      "The planets are not fortune tellers. They are mirrors — each one reflecting a different quality of attention back at you.",
    introText:
      "The planets are not fortune tellers. They are mirrors — each one reflecting a different quality of attention back at you.",
    icon: "🪐",
    themeColor: "indigo-500",
    stubLine: "This celestial body is still revealing its lore.",
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
      "Follow the seven-day planetary cadence to pair rituals with the tone of each day. Use these correspondences as gentle structure for planning, focus, and release.",
    icon: "🪐",
    themeColor: "indigo-500",
    stubLine: "This planetary day is still aligning its correspondences.",
    cardStyleClass: "from-gradient-default-start/20 to-gradient-default-end/40",
  },
  ritual: {
    title: "The Ritual Archive",
    subtitle: "Practices for presence, power, and peace.",
    introText:
      "Step into circles of smoke, salt, and song. These rituals kindle devotion and draw luminous boundaries for any practitioner seeking transformation.",
    icon: "🕯️",
    themeColor: "amber-500",
    stubLine: "This ritual is still setting its sacred stage.",
    cardStyleClass: "from-gradient-ritual-start/30 to-gradient-ritual-end/40",
  },
  tarot: {
    label: "Tarot",
    pluralLabel: "Tarot",
    emoji: "🃏",
    slug: "tarot",
    title: "The Arcana Directory",
    subtitle:
      "78 cards. Infinite mirrors. The tarot speaks in archetypes, seasons, and shadows.",
    description:
      "78 cards. Infinite mirrors. The tarot speaks in archetypes, seasons, and shadows.",
    introText:
      "Read the weave of fate through major and minor secrets alike. Each arcana whispers counsel, caution, and cosmic conversation for the seeker.",
    icon: "🃏",
    themeColor: "violet-600",
    stubLine: "This arcana awaits its card to be drawn.",
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
      "Explore structured card layouts designed to surface patterns, questions, and next steps. These spreads hold space for reflection without pretending to predict your life.",
    icon: "🪄",
    themeColor: "amber-500",
    stubLine: "This spread is still arranging its cards.",
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
