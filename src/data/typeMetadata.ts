export type TypeMetadataEntry = {
  title: string;
  subtitle: string;
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
    title: "Moonlit Phases",
    subtitle: "The rhythm of the sky’s turning face.",
    introText:
      "Chart the waxing and waning tides of lunar magic. Each phase is a compass point guiding intention, release, and the secret grammar of the night.",
    icon: "🌙",
    themeColor: "sky-400",
    stubLine: "This moon phase is still revealing its glow.",
    cardStyleClass: "from-gradient-moon-start/30 to-gradient-moon-end/40",
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
    title: "The Arcana Directory",
    subtitle: "The cards and spreads that speak in signs.",
    introText:
      "Read the weave of fate through major and minor secrets alike. Each arcana whispers counsel, caution, and cosmic conversation for the seeker.",
    icon: "🃏",
    themeColor: "violet-600",
    stubLine: "This arcana awaits its card to be drawn.",
    cardStyleClass: "from-gradient-tarot-start/30 to-gradient-tarot-end/40",
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
  href: `/entities?type=${type}`,
  themeColor: metadata.themeColor,
}));
