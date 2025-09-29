# Publishing Workflow

The WitchClick pipeline turns generated outlines into live posts. Follow this checklist to ensure each release ships safely.

## 1. Generate a draft prompt
- Use the command `npm run genprompt -- --topic "<idea>"` to request a long-form prompt.
- Review the generated copy for tone and structure before saving it to disk.

## 2. Prepare the ingest spec
- Save the approved prompt as a JSON spec that includes frontmatter fields (title, slug, tags, dates) and a Markdown `body`.
- Confirm required fields such as `title`, `slug`, `tags`, and `body` are present and valid. The ingest script now validates dates, links, and anchors before writing content.

## 3. Ingest content (manually or from the queue)
- For one-off conversions, run `npm run ingest -- path/to/spec.json` to convert the spec into Markdown.
- Add `--dry` to preview the generated frontmatter without writing files.
- The script automatically targets `src/content/posts` when it exists and reports validation errors with actionable messages.
- To automate publishing, drop approved specs into `content/prompt-queue/approved/` and schedule `npm run ingest:queue`.
  - The queue runner validates every file, writes posts, and moves successes to `content/prompt-queue/shipped/`.
  - Failed specs land in `content/prompt-queue/failed/` with timestamps so you can inspect and retry.
  - Pass `--dry` for rehearsals or `--limit <n>` to cap each run when wiring up cron or Zapier.

## 4. Review and test
- Open the post in `npm run dev` and confirm rich content, downloads, and affiliate anchors render as expected.
- Execute `npm run test` and `npm run check` before committing. Tests cover post loading, pagination, and ingestion edge cases.
- Update related entities, downloads, or settings in `content/` as needed.

## 5. Commit and deploy
- Use conventional commit messages (for example, `feat: add moon bath ritual`).
- Push your branch and open a pull request. Ensure CI checks pass, then merge via the `main` branch deployment process.
- If you automate releases, `npm run ship` runs checks and pushes with a guided message.

## 6. Monitor after launch
- Spot check the live page once the deploy finishes.
- Review analytics and affiliate dashboards (if configured) to measure early performance.

Keep this document updated as the workflow evolves so new contributors can publish confidently.
