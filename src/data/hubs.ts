export interface CuratedSection {
  title: string;
  description: string;
  posts: string[];
}

export interface HubDefinition {
  slug: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  ambient: string;
  seoDescription: string;
  sections: CuratedSection[];
  partnerHighlight?: {
    slug: string;
    blurb: string;
  };
  seasonSlug?: string;
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
    sections: [
      {
        title: "Start with a gentle exhale",
        description: "Short rituals and essays to open the door to release days.",
        posts: [
          "release-hub-intro",
          "cozy-cursing-ritual-release-anger-banishment",
          "energy-return-ritual-restore-balance",
        ],
      },
      {
        title: "Keep the boundary loving",
        description: "When you are ready for deeper shifts, these guides help you protect the space you just cleared.",
        posts: [
          "anxiety-from-avoiding-responsibilities-gentle-rituals",
          "knowing-when-to-give-up",
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
    sections: [
      {
        title: "Ease into momentum",
        description: "Begin with rituals that reconnect you to curiosity and forward motion.",
        posts: ["focus-hub-intro", "tea-ritual-for-focus", "focus-tea-rituals-gentle-brains"],
      },
      {
        title: "Support your nervous system",
        description: "Keep the focus gentle with body-led prompts and creative spreads.",
        posts: [
          "anxiety-from-avoiding-responsibilities-gentle-rituals",
          "creativity-tarot-ritual",
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
    sections: [
      {
        title: "Ground and soothe",
        description: "Arrive gently with practices that steady your body and breath.",
        posts: [
          "calm-hub-intro",
          "calm-space-during-political-unrest-2",
          "calming-strategies-when-partner-pisses-you-off",
        ],
      },
      {
        title: "Restore together",
        description: "Share calm with your pod through mutual-aid minded rituals.",
        posts: [
          "energy-return-ritual-restore-balance",
          "day-after-acupuncture-recovery-gentle-body-awareness",
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
