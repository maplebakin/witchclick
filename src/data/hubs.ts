export interface HubDefinition {
  slug: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  ambient: string;
  seoDescription: string;
  playlists: PlaylistGroup[];
  partnerHighlight?: {
    slug: string;
    blurb: string;
  };
  seasonSlug?: string;
}

export interface PlaylistGroup {
  key: string;
  title: string;
  description: string;
  chips: string[];
  posts: string[];
}

export const HUB_DEFINITIONS: Record<string, HubDefinition> = {
  release: {
    slug: "release",
    ambient: "#f97316",
    hero: {
      eyebrow: "Letting go with softness",
      title: "Release rituals & composting practices",
      lead:
        "Compost burnout, honour endings, and invite fresh energy with rituals that meet you where you are—whether you have 90 seconds or a weekend pocket.",
    },
    seoDescription:
      "Explore WitchClick's Release hub for gentle cord-cutting rituals, boundary prompts, and seasonal partner offerings that help you let go without collapse.",
    playlists: [
      {
        key: "start-here",
        title: "Start here",
        description: "A gentle welcome into release work with rituals that return energy and make room for softness.",
        chips: ["Energy return", "Kind closures"],
        posts: [
          "clean-cursing-return-energy-to-origin",
          "cozy-cursing-ritual-release-anger-banishment",
          "anxiety-from-avoiding-responsibilities-gentle-rituals",
        ],
      },
      {
        key: "quick-rituals",
        title: "Quick rituals",
        description: "Pocket-length releases when you have ten minutes and need a grounded exhale.",
        chips: ["5-minute reset", "Calm composting"],
        posts: [
          "closing-gratitude",
          "energy-return-ritual-restore-balance",
          "cozy-cursing-ritual",
        ],
      },
      {
        key: "deep-dives",
        title: "Deep dives",
        description: "Longer rituals and essays for when you want to sit with endings and practice loving boundaries.",
        chips: ["Boundary tending", "Integration"],
        posts: [
          "knowing-when-to-give-up",
          "consent-to-continue",
          "collective-intelligence",
        ],
      },
      {
        key: "tools",
        title: "Tools & printables",
        description: "Worksheets, prompts, and checklists that keep your release ritual grounded after the moment passes.",
        chips: ["Checklists", "Printable prompts"],
        posts: [
          "day-after-acupuncture-recovery-gentle-body-awareness",
          "when-life-feels-on-pause",
          "when-everything-feels-pointless",
        ],
      },
    ],
    partnerHighlight: {
      slug: "moonlit-bath-bundle",
      blurb: "A Moonlit Bath Release Bundle from Ember & Loom pairs beautifully with the energy return ritual—refillable, low-waste, and infused with calendula.",
    },
    seasonSlug: "fall-boundaries-in-bloom",
  },
  focus: {
    slug: "focus",
    ambient: "#2563eb",
    hero: {
      eyebrow: "Return to attention",
      title: "Focus rituals & gentle accountability",
      lead:
        "Somatic warm-ups, micro-plans, and co-working support for attention that feels kind and sustainable.",
    },
    seoDescription:
      "Explore WitchClick's Focus hub for ADHD-friendly rituals, body-led planning, and partner offerings that nourish concentration without force.",
    playlists: [
      {
        key: "start-here",
        title: "Start here",
        description: "Warm up attention with ritual teas and a primer on how WitchClick treats focus as kindness, not grind.",
        chips: ["Tea rituals", "Gentle planning"],
        posts: [
          "focus-tea-rituals-gentle-brains",
          "quick-low-energy-variant",
          "pre-interview-grounding-ritual",
        ],
      },
      {
        key: "quick-rituals",
        title: "Quick rituals",
        description: "Fast resets to restart momentum without overwhelming your nervous system.",
        chips: ["Micro moves", "ADHD-friendly"],
        posts: [
          "anxiety-from-avoiding-responsibilities-gentle-rituals",
          "when-to-let-yourself-rest",
          "gentle-heart-check-in",
        ],
      },
      {
        key: "deep-dives",
        title: "Deep dives",
        description: "Explore body-led planning, creative focus spreads, and stamina rituals for longer projects.",
        chips: ["Somatic focus", "Creative flow"],
        posts: [
          "creativity-tarot-ritual",
          "worldbuilding-tarot-spread-and-ritual",
          "tarot-as-a-secular-tool",
        ],
      },
      {
        key: "tools",
        title: "Tools & printables",
        description: "Printable check-ins and planning prompts that keep momentum gentle and sustainable.",
        chips: ["Planning kits", "Prompt pages"],
        posts: [
          "mindful-breathing",
          "reflection-journal",
          "pillow-and-blanket-altar",
        ],
      },
    ],
    partnerHighlight: {
      slug: "focus-ritual-deck",
      blurb: "Micah's Micro Focus Ritual Deck adds tactile accountability—each card offers a stretch, a check-in, or a celebratory pause.",
    },
    seasonSlug: "fall-boundaries-in-bloom",
  },
  calm: {
    slug: "calm",
    ambient: "#22c55e",
    hero: {
      eyebrow: "Collective soothing",
      title: "Calm rituals & community care",
      lead:
        "Grounding practices, repair scripts, and mutual-aid highlights so you can stay resourced alongside your people.",
    },
    seoDescription:
      "Explore WitchClick's Calm hub for nervous-system care, community soothing rituals, and partner offerings that redistribute rest.",
    playlists: [
      {
        key: "start-here",
        title: "Start here",
        description: "Step into the Calm hub with grounding rituals that steady breath and create immediate softness.",
        chips: ["Grounding", "Nervous system"],
        posts: [
          "calm-space-during-political-unrest-2",
          "calming-strategies-when-partner-pisses-you-off",
          "gentle-self-care-practices",
        ],
      },
      {
        key: "quick-rituals",
        title: "Quick rituals",
        description: "Low-spoon resets to calm spirals, reconnect with body, and invite a softer pace.",
        chips: ["Low spoons", "Cozy pauses"],
        posts: [
          "low-spoon-option",
          "gentle-heart-check-in",
          "mindful-breathing",
        ],
      },
      {
        key: "deep-dives",
        title: "Deep dives",
        description: "Longer practices for community soothing, mutual aid, and tending grief together.",
        chips: ["Community care", "Tender repair"],
        posts: [
          "energy-return-ritual-restore-balance",
          "day-after-acupuncture-recovery-gentle-body-awareness",
          "forgiveness-and-boundaries",
        ],
      },
      {
        key: "tools",
        title: "Tools & printables",
        description: "Downloads and prompts that help you keep calm rituals close even on wobblier days.",
        chips: ["Worksheets", "Prompt decks"],
        posts: [
          "safety-notes",
          "medical-care-plan",
          "gentle-rituals",
        ],
      },
    ],
    partnerHighlight: {
      slug: "calm-breathing-orb",
      blurb: "The Calm Breathing Orb guides paced breathing with gentle light—ideal for collective grounding before tough conversations.",
    },
    seasonSlug: "fall-boundaries-in-bloom",
  },
};
