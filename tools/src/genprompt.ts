// tools/src/genprompt.ts
import { buildMasterPrompt } from '../../server/lib/promptBuilder.js';
import generatorStyles from '../../server/lib/generatorStyles.js';
import { resolveGeneratorPresetKey } from '../../server/lib/generatorPresets.js';
import { loadPromptContext } from '../../server/lib/promptContext.js';

type GenpromptOptions = {
  topic: string;
  words: number;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
  mode?: string | null;
  style?: string | null;
  strict?: boolean | string | null;
};

const STYLES = generatorStyles as Record<string, string | undefined>;
const DEFAULT_STYLE_DIRECTIVE = STYLES.cozy ?? 'Write like a gentle, imperfect friend: warm, soft, everyday metaphors.';

export function genprompt({
  topic,
  words,
  ads,
  kofi,
  mode,
  style,
  strict: _strict,
}: GenpromptOptions) {
  const CWD = process.cwd();
  const context = loadPromptContext({ cwd: CWD });
  const brandName = context.brandName ?? 'WitchClick';
  const siteUrl = context.siteUrl ?? 'https://example.com';
  const allowedKeys = Array.isArray(context.allowedAffiliateKeys)
    ? context.allowedAffiliateKeys
    : [];
  const existingPostTitles = Array.isArray(context.existingPostTitles)
    ? context.existingPostTitles
    : [];
  const existingPostSlugs = Array.isArray(context.existingPostSlugs)
    ? context.existingPostSlugs
    : [];

  const resolvedModeKey = resolveGeneratorPresetKey(typeof mode === 'string' ? mode : '') ?? '';
  const styleKey = typeof style === 'string' ? style.trim().toLowerCase() : '';
  const styleDirective = styleKey && STYLES[styleKey] ? STYLES[styleKey] : DEFAULT_STYLE_DIRECTIVE;
  const prompt = buildMasterPrompt({
    topic,
    words,
    contentType: resolvedModeKey || undefined,
    styleDirective,
    ads,
    kofi,
    brandName,
    siteUrl,
    existingPostTitles,
    existingPostSlugs,
    allowedAffiliateKeys: allowedKeys,
    engagementSignals: context.engagementSignals,
  });

  return { prompt };
}
