# LLM Prompt Handbook — WitchClick (Posts + Curses)

Include this file in the LLM context to ensure outputs meet tone and validation in one shot.

## Global Tone & Style
- Warm, secular, neurodivergent-friendly; gentle yet precise. No gatekeeping or supernatural claims.
- Trauma-aware, consent-forward; avoid legal/medical advice, revenge fantasies, or violent imagery.
- Sensory-rich but accessible (low spoons options welcome).
- Avoid internal links, CTAs, or ads unless explicitly requested for posts; **never include them for curses** (print/PDF archive).
- Use plain JSON with double quotes; no Markdown fences or commentary.

## PostSpec v2 (Posts)
- `specVersion: 2`
- Fields: `title`, `slug` (kebab-case), `metaDescription`, `excerpt`, `tags[4-7]`, `outline[]`, `sections[]`, `entities[]` (can be empty), `internalLinkHints[]`, `affiliateHints[]`, `cta`, `adPlacements[]`, `includeAds`, `includeKofi`.
- Length guidance: `title` ~50–70 chars; `metaDescription` 140–160 chars; keep sections concise but complete.
- JSON only, no fences; trim strings. Slug must be kebab-case.
- Output one JSON object that passes schema validation.

## CurseSpec v1 (Archive Curses)
- `specVersion: 1`
- Generator inputs echoed: `type` (`reveal|return|mirror|sever|echo|smoke|threshold|knife`), `target` (`space|person|dynamic|memory|habit`), `tone` (`gentle|poetic|scathing|restrained`), optional `topic`, `sigilName`, `altarItem`, `journalingFollowUp`.
- Length windows (strict):
  - `title`: 5–13 words
  - `openingReflection`: 80–110 words
  - `invocation`: single line, max 16 words
  - `method`: 130–260 words
  - `closure`: 50–120 words
  - `safetyNotes` (optional): 25–200 chars
- Tags: exactly `["white-magic","ethical-curse","returning-energy","truthwork","mirrorcasting","clean-cursing"]` in order.
- No internal links/CTAs/ads; archive-only for print/PDF.
- JSON only, no fences; one object that validates.

## JSON Safety Rules (both)
- Use double quotes on keys/strings.
- No trailing commas.
- Do not emit Markdown fences or prose around the JSON.
- Trim strings; keep slugs kebab-case.

## Quick Reminders
- Posts go to the site; curses go to `archive/curses` (print/PDF).
- Always honor length windows and canonical tags.
- Keep language cozy, inclusive, and grounded. Avoid closed practices, deities, and woo language.
