const SETTING = 'gentle atmospheric light with a specific setting implied by the post topic, early morning or late afternoon';
const STYLE = 'WitchClick editorial illustration, cozy but grounded, tactile textures, no text or lettering';
const VISUAL_DIRECTIONS = [
  'Favor suggestive symbolic imagery over a literal scene',
  'Keep the composition interpretive and open-ended',
  'Let the image evoke the idea rather than illustrate it directly',
  'Use metaphorical details instead of a single obvious subject',
  'Avoid generic candles-and-crystals stock imagery unless the post specifically asks for it',
];

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function deriveMood(tags: string[]) {
  const normalized = tags.map((tag) => String(tag || '').toLowerCase().trim());
  const groups = [
    { keywords: ['ritual', 'ceremony'], mood: 'ceremonial and intentional' },
    { keywords: ['cozy', 'comfort'], mood: 'warm and intimate' },
    { keywords: ['shadow work', 'grief', 'loss'], mood: 'melancholic and contemplative' },
    { keywords: ['tarot', 'divination'], mood: 'mystical and symbolic' },
    { keywords: ['healing', 'self-care'], mood: 'gentle and restorative' },
    { keywords: ['nature', 'seasons'], mood: 'organic and earthbound' },
  ];
  const match = groups.find((group) =>
    group.keywords.some((keyword) => normalized.some((tag) => tag.includes(keyword))),
  );
  return match?.mood || 'atmospheric and quietly magical';
}

export type HeroPromptPostLike = {
  title?: string | null;
  slug?: string | null;
  tags?: unknown;
};

export function buildFallbackHeroPrompt(post: HeroPromptPostLike, variation = 0) {
  const tags = Array.isArray(post?.tags) ? post.tags.map((tag) => String(tag || '')) : [];
  const title = String(post?.title || post?.slug || 'Untitled post').trim() || 'Untitled post';
  const mood = deriveMood(tags);
  const direction = VISUAL_DIRECTIONS[variation % VISUAL_DIRECTIONS.length] || VISUAL_DIRECTIONS[0];
  return `Hero image prompt for a WitchClick post titled "${title}". ${capitalize(mood)} atmosphere. ${direction}. Show a concrete, emotionally precise scene that fits the reader need of the post. Render with ${SETTING}. ${capitalize(STYLE)}.`;
}
