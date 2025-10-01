export function createPostSpec(overrides: Record<string, any> = {}) {
  const baseSlug = overrides.slug || "sample-post";
  const defaultSections = [
    {
      heading: "Opening Reflection",
      markdown:
        "Take a breath and settle into the moment. This opening reflection invites you to notice the scents in the room and prepare for moon magic tonight.",
    },
    {
      heading: "Quick Ritual Variant",
      markdown:
        "Set a three-minute timer. Light a single candle and repeat your intention twice. This quick variant keeps altar setup minimal while still delivering focus.",
    },
    {
      heading: "Deep Ritual Journey",
      markdown:
        "Arrange crystals near your journal, breathe through a four-count pattern, and move slowly through a guided meditation. The deep variant layers breath work with mindful visualization for lasting calm.",
    },
    {
      heading: "Checklist Summary",
      markdown: "- Candle or LED taper\n- Favorite crystal\n- Journal and pen\n- Optional calming tea blend",
    },
    {
      heading: "Reflection Prompt",
      markdown: "What shifted in your energy tonight? Capture a brief journal entry to close the practice and note any altar setup ideas for next time.",
    },
  ];

  const defaultOutline = [
    { heading: "Opening Reflection", id: "opening-reflection" },
    { heading: "Quick Ritual Variant", id: "quick-variant" },
    { heading: "Deep Ritual Journey", id: "deep-journey" },
    { heading: "Checklist Summary", id: "checklist" },
    { heading: "Reflection Prompt", id: "reflection-prompt" },
  ];

  return {
    specVersion: 2,
    title: overrides.title || "Sample Post",
    slug: baseSlug,
    metaDescription:
      overrides.metaDescription ||
      "Explore a calming ritual with quick and deep variants, plus journal prompts and a checklist to ground your focus tonight.",
    tags: overrides.tags || ["witchcraft", "rituals", "focus", "mindfulness"],
    excerpt:
      overrides.excerpt ||
      "This ritual pairs a fast track for low-energy evenings with a deeper journey, complete with reflections and a tidy checklist.",
    outline: overrides.outline || defaultOutline,
    sections: overrides.sections || defaultSections,
    entities: overrides.entities || [],
    heroImagePrompt: Object.prototype.hasOwnProperty.call(overrides, "heroImagePrompt")
      ? overrides.heroImagePrompt
      : null,
    altTexts: overrides.altTexts || [],
    internalLinkHints:
      overrides.internalLinkHints || [
        { anchor: "moon magic", rationale: "Link to moon phase guide" },
        { anchor: "altar setup", rationale: "Cross-link altar tutorial" },
        { anchor: "guided meditation", rationale: "Promote meditation primer" },
      ],
    affiliateHints: overrides.affiliateHints || [],
    cta: overrides.cta || { type: "none" },
    adPlacements: overrides.adPlacements || ["lead"],
    ...overrides,
  };
}
