# SEO Fix Playbook (Conclusions & Links)

Warm, quick checklist to bring posts into compliance with the audit gate.

## Fast Fix Checklist (per post)
- Intro: first paragraph after the H1 is >100 chars and context-setting.
- Internal links: add 3–5 markdown links to related posts (use helper suggestions).
- External link: add ≥1 authoritative, non-competitor source.
- Conclusion: add a short closing section (e.g., “Conclusion”, “Closing Steps”, “Keep Going”).
- Word count: target ≥700 words. If under, expand reflection, add examples, or FAQs.
- Metadata sanity: ensure `publishedAt`, `readingMinutes`, `cluster`/`category` are present if applicable.

## Workflow
1) Run the audit: `npm run audit:seo`
2) Pick failing slugs and gather internal link targets:
   - `node scripts/seo-fix-helper.mjs --slug <slug>` (or run without args to see top offenders)
3) Edit the markdown:
   - Add conclusion heading + 2–3 sentences.
   - Add internal links in natural spots; prefer contextual in-body links over lists.
   - Add one external citation (studies, reputable orgs, Wikipedia for neutral definitions).
4) Re-run: `npm run audit:seo`

## Internal Link Tips
- Prefer linking to posts sharing multiple tags or the same cluster/theme.
- Use descriptive anchor text (avoid “click here”).
- Spread links across the piece (intro/body/conclusion), not all in one list.
- For curses/rituals, link to related how-tos, safety notes, or grounding practices.

## External Link Tips
- Cite neutral sources (medical orgs, journals, manuals, encyclopedias).
- Avoid competitor blogs or affiliate pages.
- Keep links do-follow unless policy requires otherwise.

## When Short on Words (<700)
- Add a tiny FAQ (2–3 Q&A), a “Try This Next” mini-list, or a sensory grounding variation.
- Expand examples: before/after, low-spoons variant, or a troubleshooting note.
