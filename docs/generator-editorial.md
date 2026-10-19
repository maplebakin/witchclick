# Topic-first article generation

The default workflow is Topic → Generate Prompt → External LLM → PostSpec JSON → Validate → Preview → Save Draft. No provider, endpoint, publishing architecture or runtime PostSpec schema has changed.

## Decisions and controls

The builder does not infer an article approach. Automatic mode asks the external model to identify reader intent before drafting, select an approach or useful combination, choose a suitable length, and populate the existing category/contentType/cluster enums. The UI and prompt explicitly describe this delegation. The topic remains authoritative over engagement suggestions and site taxonomy. `cozy-witchcraft` is the existing broad cluster fallback when no narrower label fits.

| Input | Path and effect |
| --- | --- |
| Topic | UI → `/genprompt` → shared master prompt INPUTS; required by the UI/API/CLI entrypoints. No invented fallback topic. |
| Article approach | Empty means automatic. Explicit specialist preset/legacy alias resolves to its canonical contract and valid schema content type. Only that specialist contract is included. |
| Writing voice | Existing `generatorStyles` directives remain available. WitchClick/cozy is the default. Voice affects wording rather than overriding structure, truthfulness or safety. |
| Target length | Blank means the model chooses. A positive numeric target up to 50,000 words is a manual target across CLI and APIs. In the UI, validation uses the manual target or the returned article's length when automatic. |
| Reflection questions | Array propagated through both APIs and CLI to INPUTS. Explicit questions override specialist defaults that normally exclude questions. |
| Editorial instructions | Propagated as user editorial direction, subject to schema, accuracy, consent and safety. |
| Ads | Controls `adPlacements`, rather than whether affiliate recommendations are included. |
| Ko-fi | Controls the optional support CTA. Affiliate hints continue to use relevant existing catalog keys; zero recommendations are allowed. |

Specialists retained: Curious Explainer, Practical Working, Reflective Essay, Story & Vignette, and Tarot, Crystal, Herb and Astrology grimoire entries. Legacy ritual/reflection/story/tarot/tarotSpread/spread/crystals/spellwork aliases remain supported. Tarot references can still choose `guide` rather than spread structure; explicitly symbolic spellwork can use `spellwork`.

CLI example: `npm run genprompt -- --topic "Why creative burnout can make hobbies feel like obligations"`. Optional flags include `--mode`, `--style`, `--words`, `--ads`, `--kofi`, `--reflectionPrompts` (newline-separated), and `--instructions`.

## Audit findings and fixes

- Empty mode became `ritual` in INPUTS. The UI's Grand Arcane label obscured this default. Empty now means delegated editorial planning.
- Preset identifiers were inserted directly as `contentType`. Canonical presets and aliases now map to existing valid enum values; API response metadata uses the mapping too.
- Reflection questions were sent by the UI but absent from route/helper/CLI signatures and builder inputs. They now reach the final prompt, alongside editorial instructions.
- All specialist contracts appeared in every prompt. Global checklists, ritual headings, an internal-link quota and a ritual JSON example conflicted with specialist exclusions. Prompts now include shared principles and the explicit contract, or conditional planning guidance in automatic mode. No ritual example seeds the output.
- Reflection ingestion required journaling questions even without an explicit preset. That hard requirement is removed; the explicit Reflective Essay specialist retains its questions. Existing ritual Quick/Deep, Reflection Prompt and Checklist/Summary requirements remain for compatibility.
- Link quotas and SEO minimum-length warnings encouraged padding and unrelated links. Quotas/minimums are removed while anchor integrity, schema, affiliate-key checks and safety validation remain.
- `<slot />` was placed literally inside a textarea raw-text element. The shared textarea renders its supplied slot content explicitly. Empty fields are verified empty in Chromium.
- Both PromptBuilder and its page attached generation/copy handlers. The page now owns these actions, preventing duplicate requests. The removed component handler also wrapped prompts in instructions telling the external model not to execute them.
- The Astro API's stale-prompt guard expected a phrase absent from the shared builder. It now checks the current INPUTS and opening-heading markers.
- PostSpec TypeScript enum declarations lagged behind runtime. Declarations now list existing values; runtime schema rules remain unchanged. Schema documentation no longer claims an external URL is mandatory when the schema permits omission and a reliable source is unavailable.

## Verification boundaries

Regression tests cover the four requested neutral topics, automatic defaults/length, every explicit preset, legacy aliases, supplied questions/instructions, schema compatibility of a reflection without questions, API/CLI prompt equality and the UI request. Chromium checks exercise default generation and a specialist override against the actual local API, confirm one request per click, and check that empty textareas contain no slot markup.

These are prompt-construction and workflow checks. They do not demonstrate external-model article quality, source verification, or live publication. The external model still makes automatic structural choices; its JSON must go through the existing validation and preview workflow. The compatibility heading `Opening Reflection` remains required by ingestion, but the prompt explains that its prose may be a factual introduction without questions. Rituals retain the existing ingestion structure; eliminating that constraint would be a separate editorial/validation change.
