// tools/src/genprompt.ts
import { buildMasterPrompt } from '../../server/lib/promptBuilder.js';
import generatorStyles from '../../server/lib/generatorStyles.js';
import generatorPresets, { resolveGeneratorPresetKey } from '../../server/lib/generatorPresets.js';
import { STRICT_JSON_RULES } from '../../server/lib/strictJsonRules.js';
import { loadPromptContext } from '../../server/lib/promptContext.js';

type PresetDefinition = {
  system: string;
  goal: string;
  looseOutputContract: string[];
  strictOutputContract: string[];
};

type GenpromptOptions = {
  topic: string;
  words: number;
  ads: 'on' | 'off';
  kofi: 'on' | 'off';
  mode?: string | null;
  style?: string | null;
  strict?: boolean | string | null;
};

const PRESETS = generatorPresets as Record<string, PresetDefinition | undefined>;
const STYLES = generatorStyles as Record<string, string | undefined>;
const DEFAULT_STYLE_DIRECTIVE = STYLES.cozy ?? 'Write like a gentle, imperfect friend: warm, soft, everyday metaphors.';

function buildPresetPrompt({
  preset,
  topic,
  strict,
  styleDirective,
  contentType,
}: {
  preset: PresetDefinition;
  topic: string;
  strict: boolean;
  styleDirective?: string;
  contentType?: string;
}) {
  const lines: string[] = [`SYSTEM ROLE: ${preset.system}`];

  if (styleDirective) {
    lines.push(`STYLE DIRECTIVE: ${styleDirective}`);
  }

  lines.push(`Goal: ${preset.goal}`, '', `Topic: ${topic}`, '');

  if (contentType) {
    lines.push(`IMPORTANT: Set "contentType" field to "${contentType}" in your JSON output.`, '');
  }

  const contractLines = strict ? preset.strictOutputContract : preset.looseOutputContract;

  lines.push(strict ? 'STRICT JSON CONTRACT:' : 'LOOSE JSON CONTRACT:');
  lines.push(contractLines.join('\n'));

  if (!contractLines.includes('STRICT JSON OUTPUT RULES (do all of these):')) {
    lines.push('');
    lines.push(...STRICT_JSON_RULES);
  }

  return lines.join('\n');
}

export function genprompt({
  topic,
  words,
  ads,
  kofi,
  mode,
  style,
  strict,
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
  const preset = resolvedModeKey ? PRESETS[resolvedModeKey] : undefined;
  const styleKey = typeof style === 'string' ? style.trim().toLowerCase() : '';
  const styleDirective = styleKey && STYLES[styleKey] ? STYLES[styleKey] : DEFAULT_STYLE_DIRECTIVE;
  const useStrict = strict === true || strict === 'true' || strict === '1';

  const prompt = preset
    ? buildPresetPrompt({
        preset,
        topic,
        strict: useStrict,
        styleDirective,
        contentType: resolvedModeKey || undefined,
      })
    : buildMasterPrompt({
        topic,
        words,
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
