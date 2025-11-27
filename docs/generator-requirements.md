# Generator Validation & Ingestion Requirements

Reference checklist for every generator/ingestion pipeline. Keep this in sync with the schemas and prompt guards.

## Posts (PostSpec v2)
- **Spec version:** `specVersion: 2`
- **Slug:** kebab-case, trimmed, unique across posts.
- **Lengths (guiding, enforced by schema/validators):**
  - `title`: 50–70 chars recommended
  - `metaDescription`: 140–160 chars recommended
  - `excerpt`: short paragraph (trimmed)
  - Sections/outlines must exist; hero prompt optional but preferred.
- **Structure required:** `title`, `slug`, `metaDescription`, `excerpt`, `tags` (4–7), `outline[]`, `sections[]`, `entities[]` (may be empty), `internalLinkHints[]`, `affiliateHints[]`, `cta`, `adPlacements[]`, `includeAds`, `includeKofi`.
- **JSON only:** no fences, no commentary. Strict JSON rules apply (double quotes, no trailing commas).
- **Publishing:** Ingest writes Markdown under `src/content/posts/`. Draft mode supported via admin/staging; generator prompts include length and opening-reflection guards.
- **Forbidden:** No secrets, no external tracking params, avoid placeholder affiliate IDs in production.

## Curses (CurseSpec v1, archive-only)
- **Spec version:** `specVersion: 1`
- **Slug:** kebab-case, trimmed, unique.
- **Generator inputs:** `type` (`reveal|return|mirror|sever|echo|smoke|threshold|knife`), `target` (`space|person|dynamic|memory|habit`), `tone` (`gentle|poetic|scathing|restrained`), optional `topic`, `sigilName`, `altarItem`, `journalingFollowUp`.
- **Lengths (enforced):**
  - `title`: 5–13 words
  - `openingReflection`: 80–110 words
  - `invocation`: single line, max 16 words
  - `method`: 130–260 words
  - `closure`: 50–120 words
  - `safetyNotes` (optional): 25–200 chars
- **Tags:** Must include canonical tags exactly once, ordered: `["white-magic","ethical-curse","returning-energy","truthwork","mirrorcasting","clean-cursing"]`.
- **JSON only:** one object, no fences/commentary; strict JSON rules apply.
- **Content guidance (prompt + ingest):** Archive/print/PDF only—no internal links, CTAs, or ads; emphasize ethical mirroring, sensory accessibility, and provided topic/inputs.
- **Persistence:** Ingest saves Markdown to `archive/curses/` (legacy `content/white-magic-curses/` still read-only fallback). Dev API + CLI honor archive path.

## Common Rules
- **Strict JSON:** Double quotes, no trailing commas, no Markdown fences. Fields trimmed.
- **Uniqueness:** Slugs must not collide with existing files in target directories.
- **Safety:** No secrets or tokens in content; avoid external tracking unless explicitly required.
- **Validation first:** Dry-run endpoints (`/ingest?dryRun=true`, curses dry-run, admin validate buttons) must succeed before ingesting.
