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
      eyebrow: "Threshold work",
      title: "Release rituals & refusal practices",
      lead:
        "Name what is complete, return what is not yours to carry, and make room for a value that does not require self-punishment.",
    },
    seoDescription:
      "Explore WitchClick's Release practice path for cord-cutting rituals, boundary prompts, and reflective practices for letting go without collapse.",
    playlists: [
      {
        key: "start-here",
        title: "Start here",
        description: "A clear welcome into release work with rituals that return attention and make room for honest closure.",
        chips: ["Energy return", "Clean closure"],
        posts: [
          "clean-cursing-return-energy-to-origin",
          "cozy-cursing-ritual-release-anger-banishment",
          "anxiety-from-avoiding-responsibilities-gentle-rituals",
        ],
      },
      {
        key: "quick-rituals",
        title: "Quick rituals",
        description: "Pocket-length releases when you have ten minutes and need to stop carrying the whole room.",
        chips: ["5-minute reset", "Threshold pause"],
        posts: [
          "closing-gratitude",
          "energy-return-ritual-restore-balance",
          "cozy-cursing-ritual",
        ],
      },
      {
        key: "deep-dives",
        title: "Deep dives",
        description: "Longer rituals and essays for sitting with endings, clean refusal, and boundaries that protect your future self.",
        chips: ["Boundary tending", "Refusal"],
        posts: [
          "knowing-when-to-give-up",
          "consent-to-continue",
          "collective-intelligence",
        ],
      },
      {
        key: "tools",
        title: "Tools & printables",
        description: "Worksheets, prompts, and checklists that help release work stay grounded after the first exhale.",
        chips: ["Checklists", "Reflection prompts"],
        posts: [
          "day-after-acupuncture-recovery-gentle-body-awareness",
          "when-life-feels-on-pause",
          "when-everything-feels-pointless",
        ],
      },
    ],
    partnerHighlight: {
      slug: "moonlit-bath-bundle",
      blurb: "A Moonlit Bath Release Bundle from Ember & Loom pairs with energy return work when you want the body to notice the boundary too.",
    },
    seasonSlug: "fall-boundaries-in-bloom",
  },
  focus: {
    slug: "focus",
    ambient: "#2563eb",
    hero: {
      eyebrow: "Return to attention",
      title: "Focus rituals & attention anchors",
      lead:
        "Somatic warm-ups, micro-plans, and reflective supports for choosing where your attention belongs next.",
    },
    seoDescription:
      "Explore WitchClick's Focus practice path for neurodivergent-aware rituals, body-led planning, and reflective tools that support attention without force.",
    playlists: [
      {
        key: "start-here",
        title: "Start here",
        description: "Warm up attention with ritual teas and a primer on treating focus as a chosen lens, not a grind.",
        chips: ["Tea rituals", "Chosen focus"],
        posts: [
          "focus-tea-rituals-gentle-brains",
          "quick-low-energy-variant",
          "pre-interview-grounding-ritual",
        ],
      },
      {
        key: "quick-rituals",
        title: "Quick rituals",
        description: "Fast resets for finding the next honest step without forcing your whole self into task mode.",
        chips: ["Micro moves", "Low-spoons"],
        posts: [
          "anxiety-from-avoiding-responsibilities-gentle-rituals",
          "when-to-let-yourself-rest",
          "gentle-heart-check-in",
        ],
      },
      {
        key: "deep-dives",
        title: "Deep dives",
        description: "Explore body-led planning, creative tarot spreads, and stamina rituals for work that still belongs to you.",
        chips: ["Somatic focus", "Creative attention"],
        posts: [
          "creativity-tarot-ritual",
          "worldbuilding-tarot-spread-and-ritual",
          "tarot-as-a-secular-tool",
        ],
      },
      {
        key: "tools",
        title: "Tools & printables",
        description: "Printable check-ins and planning prompts that keep attention visible without making worth depend on output.",
        chips: ["Planning kits", "Attention prompts"],
        posts: [
          "mindful-breathing",
          "reflection-journal",
          "pillow-and-blanket-altar",
        ],
      },
    ],
    partnerHighlight: {
      slug: "focus-ritual-deck",
      blurb: "Micah's Micro Focus Ritual Deck adds tactile structure: each card offers a stretch, a check-in, or a pause that lets attention return.",
    },
    seasonSlug: "fall-boundaries-in-bloom",
  },
  calm: {
    slug: "calm",
    ambient: "#22c55e",
    hero: {
      eyebrow: "Grounding without erasure",
      title: "Calm rituals & steadying practices",
      lead:
        "Grounding practices, repair scripts, and small anchors for staying present without pretending everything is fine.",
    },
    seoDescription:
      "Explore WitchClick's Calm practice path for grounding rituals, repair scripts, and reflective practices that help you stay present without supernatural promises.",
    playlists: [
      {
        key: "start-here",
        title: "Start here",
        description: "Step into the Calm path with grounding rituals that steady breath and give attention somewhere safe to land.",
        chips: ["Grounding", "Safe landing"],
        posts: [
          "calm-space-during-political-unrest-2",
          "calming-strategies-when-partner-pisses-you-off",
          "gentle-self-care-practices",
        ],
      },
      {
        key: "quick-rituals",
        title: "Quick rituals",
        description: "Low-spoon resets for interrupting spirals, reconnecting with the body, and choosing a smaller next moment.",
        chips: ["Low spoons", "Small pauses"],
        posts: [
          "low-spoon-option",
          "gentle-heart-check-in",
          "mindful-breathing",
        ],
      },
      {
        key: "deep-dives",
        title: "Deep dives",
        description: "Longer practices for repair, mutual aid, and tending grief without flattening it into a lesson.",
        chips: ["Community care", "Grief tending"],
        posts: [
          "energy-return-ritual-restore-balance",
          "day-after-acupuncture-recovery-gentle-body-awareness",
          "forgiveness-and-boundaries",
        ],
      },
      {
        key: "tools",
        title: "Tools & printables",
        description: "Downloads and prompts that help calm practices stay reachable on wobblier days.",
        chips: ["Worksheets", "Anchor prompts"],
        posts: [
          "safety-notes",
          "medical-care-plan",
          "gentle-rituals",
        ],
      },
    ],
    partnerHighlight: {
      slug: "calm-breathing-orb",
      blurb: "The Calm Breathing Orb guides paced breathing with gentle light, useful before hard conversations or any moment that needs a steadier lens.",
    },
    seasonSlug: "fall-boundaries-in-bloom",
  },
};
