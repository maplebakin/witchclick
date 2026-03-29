#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
      const key = token.slice(2, eqIndex);
      const value = token.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node scripts/apocapalette-to-theme.mjs \
    --input "/path/to/apocapalette-export.json" \
    --slug "my-theme-slug" \
    --label "My Theme Label" \
    --mode "midnight" \
    --category "custom" \
    [--fonts-heading "Cinzel"] \
    [--fonts-serif "Cormorant Garamond"] \
    [--fonts-script "Great Vibes"]`);
}

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildLookup(exportData) {
  const exact = new Map();
  const normalized = new Map();

  for (const [groupName, groupValue] of Object.entries(exportData || {})) {
    if (!groupValue || typeof groupValue !== 'object' || Array.isArray(groupValue)) continue;

    for (const [rawKey, rawToken] of Object.entries(groupValue)) {
      if (!rawToken || typeof rawToken !== 'object') continue;
      if (!('value' in rawToken)) continue;

      const joined = `${groupName}.${rawKey}`.toLowerCase();
      const value = rawToken.value;

      if (!exact.has(joined)) exact.set(joined, value);

      const norm = normalizeKey(joined);
      if (!normalized.has(norm)) normalized.set(norm, value);
    }
  }

  return { exact, normalized };
}

function makeResolver(lookup) {
  return function resolve(paths) {
    for (const p of paths) {
      const lower = p.toLowerCase();
      if (lookup.exact.has(lower)) return lookup.exact.get(lower);

      const norm = normalizeKey(lower);
      if (lookup.normalized.has(norm)) return lookup.normalized.get(norm);
    }
    return undefined;
  };
}

function isMissing(v) {
  return v === undefined || v === null || v === '';
}

function ensureMixFromBackground(settings, key, percent) {
  if (!isMissing(settings[key])) return;
  if (isMissing(settings.background)) return;
  settings[key] = `color-mix(in srgb, ${settings.background} ${percent}%, transparent)`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const input = args.input;
  const slug = args.slug;
  const label = args.label;
  const mode = args.mode;
  const category = args.category;

  if (!input || !slug || !label || !mode || !category) {
    usage();
    process.exit(1);
  }

  const fontHeading = args['fonts-heading'] || 'Cinzel';
  const fontSerif = args['fonts-serif'] || 'Cormorant Garamond';
  const fontScript = args['fonts-script'] || 'Great Vibes';

  const inputPath = path.resolve(input);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const exportData = JSON.parse(raw);

  const lookup = buildLookup(exportData);
  const resolve = makeResolver(lookup);

  const settings = {
    primary: resolve(['brand.primary']),
    accent: resolve(['brand.accent']),
    background: resolve(['surfaces.background', 'surfaces.pagebackground']),

    fontSerif,
    fontScript,
    fontHeading,
    fontAccent: fontScript,

    textPrimary: resolve(['textpalette.textprimary']),
    textHeading: resolve(['typography.heading']),
    textMuted: resolve(['typography.textmuted']),
    textSecondary: resolve(['textpalette.textsecondary']),
    textTertiary: resolve(['textpalette.texttertiary']),
    textStrong: resolve(['typography.textstrong']),
    textHint: resolve(['typography.texthint', 'textpalette.texthint']),
    textDisabled: resolve(['typography.textdisabled', 'textpalette.textdisabled']),
    textBody: resolve(['typography.textbody']),
    textSubtle: resolve(['aliases.textsubtle']),
    textAccent: resolve(['textpalette.textaccent', 'typography.textaccent']),
    textAccentStrong: resolve(['textpalette.textaccentstrong', 'typography.textaccentstrong']),
    linkColor: resolve(['textpalette.linkcolor', 'brand.linkcolor']),

    colorMidnight: resolve(['named.colormidnight']),
    colorNight: resolve(['named.colornight']),
    colorIris: resolve(['named.coloriris']),
    colorAmethyst: resolve(['named.coloramethyst']),
    colorDusk: resolve(['named.colordusk']),
    colorGold: resolve(['named.colorgold']),
    colorRune: resolve(['named.colorrune']),
    colorFog: resolve(['named.colorfog']),
    colorInk: resolve(['named.colorink']),

    colorMuted: undefined,
    colorBorder: resolve(['borders.bordersubtle']),
    colorBorderStrong: resolve(['borders.borderstrong']),
    colorOverlay: undefined,
    colorOverlayStrong: undefined,

    surfacePlain: resolve(['surfaces.surfaceplain']),
    surfacePlainBorder: resolve(['surfaces.surfaceplainborder']),

    cardPanelSurface: resolve(['cards.cardpanelsurface']),
    cardPanelSurfaceStrong: resolve(['cards.cardpanelsurfacestrong']),
    cardPanelBorder: resolve(['cards.cardpanelborder']),
    cardPanelBorderStrong: resolve(['cards.cardpanelborderstrong']),
    cardPanelBorderSoft: resolve(['cards.cardpanelbordersoft']),

    glassSurface: resolve(['glass.glasssurface']),
    glassSurfaceStrong: resolve(['glass.glasssurfacestrong']),
    glassCard: resolve(['glass.glasssurface']),
    glassHover: resolve(['glass.glasshover']),
    glassBorder: resolve(['glass.glassborder']),
    glassBorderStrong: resolve(['glass.glassborderstrong']),
    glassHighlight: resolve(['glass.glasshighlight']),
    glassGlow: resolve(['glass.glassglow']),
    glassShadowSoft: resolve(['glass.glassshadowsoft']),
    glassShadowStrong: resolve(['glass.glassshadowstrong']),
    glassBlur: resolve(['glass.glassblur']),
    glassNoiseOpacity: resolve(['glass.glassnoiseopacity']),

    inkBody: resolve(['glass.glasssurface']),
    inkStrong: resolve(['named.colormidnight']),
    inkMuted: resolve(['named.colordusk']),

    cardBadgeBg: resolve(['cards.cardtagbg']),
    cardBadgeBorder: resolve(['cards.cardtagborder']),
    cardBadgeText: resolve(['cards.cardtagtext']),
    cardTagBg: resolve(['cards.cardtagbg']),
    cardTagBorder: resolve(['cards.cardtagborder']),
    cardTagText: resolve(['cards.cardtagtext']),

    cardSpoonBg: resolve(['surfaces.surfaceplain']),
    cardSpoonBorder: resolve(['surfaces.surfaceplain']),
    cardSpoonText: resolve(['textpalette.textprimary']),

    focusRingColor: resolve(['aliases.focusring', 'brand.focusring']),
    cardFocusOutline: resolve(['aliases.focusring']),

    success: resolve(['status.success']),
    warning: resolve(['status.warning']),
    error: resolve(['status.error']),
    info: resolve(['status.info']),

    entityCardBorder: resolve(['entity.entitycardborder']),
    entityCardGlow: resolve(['entity.entitycardglow']),
    entityCardHighlight: resolve(['entity.entitycardhighlight']),
    entityCardSurfaceTop: resolve(['entity.entitycardsurface']),
    entityCardSurfaceBottom: resolve(['entity.entitycardsurface']),
    entityCardHeading: resolve(['entity.entitycardheading']),
    entityCardText: resolve(['textpalette.textprimary']),
    entityCardLabel: resolve(['textpalette.textsecondary']),
    entityCardCta: resolve(['brand.primary']),
    entityCardCtaHover: resolve(['brand.accent']),
    entityCardIcon: resolve(['brand.accent']),
    entityCardIconShadow: resolve(['glass.glassshadowsoft']),

    headerBackground: resolve(['surfaces.headerbackground']),
    headerBorder: resolve(['borders.bordersubtle']),
    headerText: resolve(['textpalette.textprimary']),
    headerTextHover: resolve(['textpalette.textaccent']),

    footerBackground: resolve(['surfaces.surfaceplain']),
    footerBorder: resolve(['borders.bordersubtle']),
    footerText: resolve(['typography.footertext']),
    footerTextMuted: resolve(['typography.footertextmuted'])
  };

  ensureMixFromBackground(settings, 'colorMuted', 72);
  ensureMixFromBackground(settings, 'colorOverlay', 45);
  ensureMixFromBackground(settings, 'colorOverlayStrong', 68);

  const unresolved = Object.entries(settings)
    .filter(([, value]) => isMissing(value))
    .map(([key]) => key);

  const cleanedSettings = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!isMissing(value)) cleanedSettings[key] = value;
  }

  const theme = {
    slug,
    label,
    mode,
    category,
    settings: cleanedSettings
  };

  const outPath = path.resolve('/home/maddie/Documents/code/witchclick/content/themes', `${slug}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(theme, null, 2)}\n`, 'utf8');

  console.log(`Wrote theme: ${outPath}`);
  if (unresolved.length) {
    console.warn('Unresolved settings keys (manual fill may be needed):');
    for (const key of unresolved) console.warn(`- ${key}`);
  } else {
    console.log('All mapped settings were resolved.');
  }
}

main();
