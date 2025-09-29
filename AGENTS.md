# AGENTS

## Roles
- Architect — plans changes and acceptance criteria.
- Implementer — writes only the diffs that satisfy the plan.
- Docs — updates README/CHANGELOG/PR text.

## Repo Rituals
- Default branch: main
- Branch names: feat/<slug>, fix/<slug>, chore/<slug>
- Commits: Conventional Commits (feat:, fix:, chore:)
- PR body must include: Problem & Scope, Acceptance Criteria, Changes Summary, Build/Checks (commands), Risk & Rollback.

## Commands (auto-detected)
- Dev server: `npm run dev`
- Dev server (LAN): `npm run dev:host`
- Dev server + local API: `npm run dev:all`
- Build: `npm run build`
- Preview: `npm run preview`
- Tests: `npm run test`
- Tests (watch): `npm run test:watch`
- Check (astro check → build fallback to tsc): `npm run check`
- Content ingest: `npm run ingest`
- Prompt generator: `npm run genprompt`
- Ship helper (check → commit → push): `npm run ship -- "feat: message"`
- Snapshot zip: `npm run zip`

## Tooling Map (auto-detected)
- `dev-api.js` — local admin API on port 8787 with POST endpoints: `/ping`, `/genprompt`, `/ingest`, `/bundle`, `/entities/list`, `/entities/get`, `/entities/save`, `/posts/save`.
- `node tools/wc.js <cmd>` — WitchClick CLI commands:
  - `genprompt --topic <text> [--words <n>] [--ads on|off] [--kofi on|off]`
  - `ingest --from-file <path>`
  - `linker`
  - `seo --slug <slug> [--apply]`
  - `export --slug <slug> --format <fmt>`
  - `go:build`
  - `health`

## Guardrails
- Don’t touch secrets or .env.
- Don’t rename public endpoints without approval.
- Preserve JSON schemas/contracts used by content generation.
- Keep diffs scoped to the approved plan.

## Review Gates
- Lint/typecheck pass (if present)
- Tests pass (if present)
- Build/bundle succeeds (if present)
- PR body includes Acceptance Criteria
