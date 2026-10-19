# Generator save and hero continuity

## Confirmed development reload

A real Chromium session against isolated copies of Astro dev and `dev-api.js` reproduced this sequence:

1. Save Draft persisted `src/content/posts/workflow-reload-fixture.md`.
2. Astro's content loader updated `.astro/data-store.json`.
3. `astro-content-virtual-mod-plugin` broadcast `{type:"full-reload",path:"*"}`.
4. Chromium navigated to `/admin/generator` again; the in-memory sentinel, JSON and inputs disappeared.

There is no save-handler navigation/form submission, and `scripts/dev-with-api.mjs` does not restart its children on content writes. The local-publication bundle can also write watched assets. Public hero uploads and hero-frontmatter updates have the same interruption risk.

## Scoped development behavior

`generatorDevSession()` is a serve-only Vite plugin. The generator explicitly subscribes using Vite's custom WebSocket events. Only that client's exposed socket defers `full-reload` messages, translating them into a generator update notice. It does not replace `server.ws.send`, browser navigation, or global WebSocket behavior. Other clients still receive the original full reloads, and the generator still receives CSS updates and errors. Watchers and content-store invalidation remain enabled, so public previews stay current.

The YAML dependency is prebundled at startup so a first-load dependency optimization cannot strand the hero component on an outdated import. A queued saved target also survives a save arriving before that component has mounted.

Full reloads caused by development source changes are deferred in this tab too. The notice tells the operator to refresh when ready to load code changes. Ordinary manual navigation/refresh remains available. This is development-only; production builds do not install the plugin or open a subscription. Restart the development stack after changing server-side API code.

## Saved identity and artwork

The generator dispatches only the ingestion endpoint's confirmed final slug. A canonical PostSpec normally lacks persisted `draft` and hero metadata: the shared HeroWorkflow now rereads `/posts/load` when a supplied snapshot is incomplete or mismatched. Failed reads leave artwork writes locked and offer a load-only retry. A successful response without a final slug clears the previous target rather than leaving another article selected.

The shared workflow continues to own prompt editing, choose/drop preview, upload, alt text, attachment and reread verification. Prompt saving quotes strings so YAML timestamps remain strings for Astro's content schema. Existing artwork replacement requires confirmation. Attachment includes the observed existing hero path; the API checks that expectation and the post contents inside the write lock, rejecting stale changes with 409. Refreshing hero status preserves selected/uploaded artwork and alt text so an operator can review and retry without ingesting again.

Verified success identifies the post, image and alt text, with explicit unchanged publishing state. A draft stays private; hero work never deploys. The standalone `/admin/hero` picker uses the same shared implementation.

## Tests

- `npm run test:e2e:generator` runs real Astro dev/API processes in independent temporary project copies (without `.env`/`.git`), using shared installed dependencies. It measures actual document navigations and a page-global mount sentinel across save, prompt edit, upload, attachment and failure recovery; it also confirms a separate public tab still reloads and local publication runs its real bundle without navigation.
- Vitest covers per-socket delivery isolation, saved-slug identity, incomplete-metadata retries, unchanged workspace, replacement confirmation, upload/attachment recovery, YAML timestamp fidelity and stale attachment rejection.
- Existing content, prompt/schema contracts and public page sources are not changed. A pre-existing missing redirect in the dirty `public/_redirects` file causes the unrelated religious-reminder redirect assertion to fail; this change does not restore or modify that file.


## Changed files and validation

- `astro.config.mjs`, `scripts/lib/generator-dev-session.mjs` and its declaration, and `src/scripts/admin/generator-dev-session.ts`: route-scoped development reload delivery and dependency warmup.
- `src/pages/admin/generator.astro`: development notice, confirmed-slug handoff/queue and clearing an unknown saved target.
- `src/scripts/admin/hero-workflow.ts`: persisted metadata loading, prompt/YAML fidelity, replacement consent, recovery and explicit success.
- `dev-api.js`: stale-post/hero protection inside the attachment write lock.
- `tests/admin-generator.test.ts`, `tests/admin-hero.test.ts`, `tests/hero-attach.test.ts`, `tests/generator-dev-session.test.ts`, `tests/generator-dev.spec.ts`, `playwright.generator.config.ts`, `vitest.config.ts`, and `package.json`: regression coverage and the isolated real-development test command.

Final browser acceptance: **2 passed**, including actual Markdown writes, prompt updates, hero upload/attachment, a failed attachment retry, slug collision, public-tab HMR and a real local-publication bundle. The generator retained the original page-global sentinel with **zero main-frame navigations**. Targeted unit tests: **47 passed**. Full unit suite: **480 passed, 1 pre-existing redirect assertion failed** as described above. Type/lint checks and production build pass (seven existing lint warnings); draft-leak and diff checks pass. Checksums confirm the user's dirty redirects file and untracked relationship article are unchanged.
