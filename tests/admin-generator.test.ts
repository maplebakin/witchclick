import fs from "node:fs";
import ts from "typescript";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildFallbackHeroPrompt } from "../src/utils/heroPrompt";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { executeIngest } from "../server/lib/ingestExecutor.js";
import { normalizeDraftSpec } from "../src/scripts/normalizeDraftSpec.js";
import { createPostSpec } from "./postSpecTestUtils";

const source = fs.readFileSync(new URL("../src/pages/admin/generator.astro", import.meta.url), "utf8");
const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)![1]!;
const heroMarkup = fs.readFileSync(new URL('../src/components/admin/HeroWorkflow.astro', import.meta.url), 'utf8').split('\n---\n')[1]!.split('<script>')[0]!
  .replace(/hidden=\{mode !== 'picker'\}/g, 'hidden').replace(/data-locked-message=\{lockedMessage\}/g, 'data-locked-message="Locked — available after this post is saved."')
  .replace(/>\{lockedMessage\}</g, '>Locked — available after this post is saved.<').replace(/data-mode=\{mode\}/g, 'data-mode="embedded"')
  .replace(/data-hero-slug=\{slug\}/g, 'data-hero-slug=""').replace(/data-dev-api=\{devApi\}/g, 'data-dev-api="http://fixture.local"').replace(/data-dev-key=\{devKey\}/g, 'data-dev-key=""');
const heroScript = ts.transpileModule(fs.readFileSync(new URL('../src/scripts/admin/hero-workflow.ts', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
interface Request { url: URL; body: Record<string, any>; dry: boolean }
const doms: JSDOM[] = [];
const directories: string[] = [];
afterEach(() => {
  doms.splice(0).forEach((dom) => dom.window.close());
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});
const response = (data: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, text: async () => JSON.stringify(data), json: async () => data });
function setup(handler?: (request: Request) => Promise<ReturnType<typeof response> | undefined> | ReturnType<typeof response> | undefined) {
  const dom = new JSDOM(`<div data-panel-root data-dev-api="http://fixture.local"><div data-panel="posts"></div><section data-generator-hero data-panel="posts">${heroMarkup}</section><div data-panel="curses" class="hidden"></div><button data-panel-toggle="posts"></button><button data-panel-toggle="curses"></button>
    <textarea id="spec"></textarea><div id="status"></div><div id="specSummary"></div><div id="preview"></div>
    <p id="saveOutcome"></p><p id="bundleStatus"></p><details id="bundleDetails"><pre id="bundleError"></pre></details>
    ${["validateBtn", "previewBtn", "ingestBtn", "ingestPublishBtn", "clearBtn", "retryBundleBtn", "genPrompt", "copyPrompt"].map((id) => `<button id="${id}"></button>`).join("")}
    <details data-post-history><aside data-recent-panel><div data-recent-list></div><button data-recent-refresh></button><input data-recent-filter /></aside></details>
    </div>`, { runScripts: "outside-only" });
  doms.push(dom);
  const window = dom.window;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  Object.assign(window, { WitchClick: { normalizeDraftSpec } });
  Object.assign(window, { parseYaml, stringifyYaml, buildFallbackHeroPrompt });
  window.confirm = vi.fn(() => true);
  const requests: Request[] = [];
  window.fetch = vi.fn(async (url, options) => {
    const request = { url: new URL(String(url)), body: JSON.parse(String(options?.body || "{}")), dry: String(url).includes("dryRun=true") };
    requests.push(request);
    const custom = handler && await handler(request);
    if (custom) return custom as Response;
    if (request.url.pathname === "/posts/list") return response({ ok: true, items: [{ title: "Source post", slug: "source-post", tags: ["source"] }] }) as Response;
    if (request.url.pathname === "/posts/load") return response({ ok: true, slug: request.body.slug, frontmatter: stringifyYaml({slug: request.body.slug, title: "Saved post", draft: true, tags: ["cozy"]}) }) as Response;
    if (request.url.pathname === "/bundle") return response({ ok: true }) as Response;
    return response({ ok: true, spec: request.body, saved: !request.dry, slug: request.body.slug, warnings: [], errors: [] }) as Response;
  });
  window.eval(heroScript+'\nwindow.testHeroMount = mountHeroWorkflow;');
  (window as any).testHeroMount(window.document.querySelector('[data-hero-workflow]'));
  window.eval(script);
  const element = <T extends HTMLElement = HTMLElement>(id: string) => window.document.getElementById(id) as T;
  const edit = (value: unknown) => {
    element<HTMLTextAreaElement>("spec").value = typeof value === "string" ? value : JSON.stringify(value);
    element("spec").dispatchEvent(new window.Event("input"));
  };
  const click = (id: string) => element<HTMLButtonElement>(id).click();
  const idle = async () => vi.waitFor(() => expect(element<HTMLButtonElement>("ingestBtn").disabled).toBe(false));
  return { window, requests, element, edit, click, idle, writes: () => requests.filter((request) => request.url.pathname === "/ingest" && !request.dry) };
}

describe("Generator action model", () => {
  it("removes the mode toggle and retains one explicit publication action", () => {
    expect(source).not.toMatch(/data-save-mode|currentSaveMode|setSaveMode|Infuse stub/);
    expect(source.match(/id="ingestPublishBtn"/g)).toHaveLength(1);
    expect(source).toContain("Make publicly eligible locally");
    expect(source).toContain("data-post-history");
    expect(source.indexOf("data-post-history")).toBeGreaterThan(source.indexOf('id="preview"'));
    expect(source).not.toContain("lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]");
  });
  it("Save Draft forces draft intent for both validation and persistence", async () => {
    const ui = setup(); ui.edit(createPostSpec({ _draft: false })); ui.click("ingestBtn"); await ui.idle();
    const ingest = ui.requests.filter((request) => request.url.pathname === "/ingest");
    expect(ingest).toHaveLength(2);
    expect(ingest.map((request) => request.dry)).toEqual([true, false]);
    expect(ingest.every((request) => request.url.searchParams.get("draft") === "true" && request.body._draft === true)).toBe(true);
    expect(ui.element("saveOutcome").textContent).toContain("not publicly eligible");
    expect(ui.requests.some((request) => request.url.pathname === "/bundle")).toBe(false);
  });
  it("does not write malformed JSON", async () => {
    const ui = setup(); ui.edit("{broken"); ui.click("ingestBtn"); await ui.idle();
    expect(ui.writes()).toHaveLength(0);
    expect(ui.element("status").textContent).toContain("Invalid JSON");
  });
  it("does not write schema-invalid JSON", async () => {
    const ui = setup((request) => request.url.pathname === "/ingest" ? response({ ok: false, errors: ["Missing sections"], error: "Invalid content" }, false) : undefined);
    ui.edit({ title: "Missing content" }); ui.click("ingestBtn"); await ui.idle();
    expect(ui.writes()).toHaveLength(0);
    expect(ui.element("status").textContent).toContain("Missing sections");
  });
  it("blocks publication until the current JSON is validated, and again after editing", async () => {
    const ui = setup(); ui.edit(createPostSpec());
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(true);
    ui.click("validateBtn"); await ui.idle();
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(false);
    ui.edit(createPostSpec({ title: "Changed" }));
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(true);
    ui.element("ingestPublishBtn").dispatchEvent(new ui.window.Event("click")); await ui.idle();
    expect(ui.writes()).toHaveLength(0);
    expect(ui.element("status").textContent).toContain("Validate the current JSON");
  });
  it("checks the value itself even when a programmatic change omits an input event", async () => {
    const ui = setup(); ui.edit(createPostSpec()); ui.click("validateBtn"); await ui.idle();
    ui.element<HTMLTextAreaElement>("spec").value += " "; ui.click("ingestPublishBtn"); await ui.idle();
    expect(ui.writes()).toHaveLength(0);
  });
  it("revalidates publication immediately before writing and owns the public intent", async () => {
    const ui = setup(); ui.edit(createPostSpec({ _draft: true })); ui.click("validateBtn"); await ui.idle();
    ui.click("ingestPublishBtn"); await ui.idle();
    const ingest = ui.requests.filter((request) => request.url.pathname === "/ingest");
    expect(ingest.map((request) => request.dry)).toEqual([true, true, false]);
    expect(ingest.every((request) => request.body._draft === false && !request.url.searchParams.has("draft"))).toBe(true);
    expect(ui.element("saveOutcome").textContent).toContain("publicly eligible locally");
    expect(ui.element("bundleStatus").textContent).toContain("not been deployed");
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(true);
  });
  it("disables writes in flight and rejects changes made during async validation", async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    const ui = setup(async (request) => {
      if (request.url.pathname === "/ingest" && request.dry) { await wait; return response({ ok: true, spec: request.body }); }
      return undefined;
    });
    ui.edit(createPostSpec()); ui.click("ingestBtn");
    expect(ui.element<HTMLButtonElement>("ingestBtn").disabled).toBe(true);
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(true);
    expect(ui.element<HTMLTextAreaElement>("spec").readOnly).toBe(true);
    ui.edit(createPostSpec({ title: "Changed while validating" })); release(); await ui.idle();
    expect(ui.writes()).toHaveLength(0);
    expect(ui.element("status").textContent).toContain("changed during validation");
  });
  it("keeps a save success separate from bundle failure; retry only reruns the bundle", async () => {
    let bundles = 0;
    const ui = setup((request) => request.url.pathname === "/bundle" ? response(++bundles === 1 ? { ok: false, error: "Linker failed" } : { ok: true }, bundles > 1) : undefined);
    ui.edit(createPostSpec()); ui.click("validateBtn"); await ui.idle(); ui.click("ingestPublishBtn"); await ui.idle();
    expect(ui.element("saveOutcome").textContent).toContain("Saved");
    expect(ui.element("status").textContent).not.toContain("failed");
    expect(ui.element("bundleStatus").textContent).toContain("Bundle failed: Linker failed");
    expect(ui.element<HTMLButtonElement>("retryBundleBtn").hidden).toBe(false);
    const writes = ui.writes().length;
    ui.click("retryBundleBtn"); await ui.idle();
    expect(ui.writes()).toHaveLength(writes);
    expect(bundles).toBe(2);
    expect(ui.element("bundleStatus").textContent).toContain("Bundle completed");
  });
  it("never starts a bundle when saving fails", async () => {
    const ui = setup((request) => request.url.pathname === "/ingest" && !request.dry ? response({ ok: false, error: "Disk write failed" }, false) : undefined);
    ui.edit(createPostSpec()); ui.click("validateBtn"); await ui.idle(); ui.click("ingestPublishBtn"); await ui.idle();
    expect(ui.element("saveOutcome").textContent).toBe("");
    expect(ui.element("status").textContent).toContain("Disk write failed");
    expect(ui.requests.some((request) => request.url.pathname === "/bundle")).toBe(false);
  });
  it("does not claim a save or run a bundle for an unconfirmed/dry-run response", async () => {
    const ui = setup((request) => request.url.pathname === "/ingest" && !request.dry ? response({ ok: true, saved: false }) : undefined);
    ui.edit(createPostSpec()); ui.click("validateBtn"); await ui.idle(); ui.click("ingestPublishBtn"); await ui.idle();
    expect(ui.element("saveOutcome").textContent).toBe("");
    expect(ui.requests.some((request) => request.url.pathname === "/bundle")).toBe(false);
  });
  it("confirms clearing meaningful unsaved content and respects cancel", () => {
    const ui = setup(); ui.edit(createPostSpec()); ui.window.confirm = vi.fn(() => false);
    ui.click("clearBtn"); expect(ui.element<HTMLTextAreaElement>("spec").value).not.toBe("");
    expect(ui.window.confirm).toHaveBeenCalledOnce();
    ui.window.confirm = vi.fn(() => true); ui.click("clearBtn");
    expect(ui.element<HTMLTextAreaElement>("spec").value).toBe("");
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(true);
  });
  it("clears empty or confirmed-saved JSON without an unsaved-content prompt", async () => {
    const ui = setup(); ui.click("clearBtn"); expect(ui.window.confirm).not.toHaveBeenCalled();
    ui.edit(createPostSpec()); ui.click("ingestBtn"); await ui.idle(); ui.click("clearBtn");
    expect(ui.window.confirm).not.toHaveBeenCalled();
  });
  it("copies source metadata as an unvalidated template for new content", async () => {
    const ui = setup();
    await vi.waitFor(() => expect(ui.window.document.querySelector("[data-recent-insert]")).not.toBeNull());
    const button = ui.window.document.querySelector<HTMLButtonElement>("[data-recent-insert]")!;
    expect(button.textContent).toBe("Copy as new-post template"); button.click();
    expect(JSON.parse(ui.element<HTMLTextAreaElement>("spec").value).slug).toBe("source-post");
    expect(ui.element("status").textContent).toContain("source is never replaced");
    expect(ui.element<HTMLButtonElement>("ingestPublishBtn").disabled).toBe(true);
    expect(ui.writes()).toHaveLength(0);
  });
  it("uses existing ingestion to persist a draft under a unique slug without overwriting the source", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wc-generator-test-")); directories.push(directory);
    const postsDir = path.join(directory, "src/content/posts"); fs.mkdirSync(postsDir, { recursive: true });
    const original = "---\ntitle: Original\nslug: source-post\n---\nUntouched source.\n";
    fs.writeFileSync(path.join(postsDir, "source-post.md"), original);
    const ui = setup(async (request) => {
      if (request.url.pathname !== "/ingest") return undefined;
      const { _draft, ...spec } = request.body;
      const result = await executeIngest(spec, { cwd: directory, postsDirectories: [postsDir], dryRun: request.dry, draft: _draft === true, forceCategory: "ritual" });
      return response({ ok: true, saved: !request.dry, slug: result.prepared.spec.slug, spec: result.prepared.spec });
    });
    ui.edit(createPostSpec({ slug: "source-post", _draft: false })); ui.click("ingestBtn"); await ui.idle();
    expect(fs.readFileSync(path.join(postsDir, "source-post.md"), "utf8")).toBe(original);
    const writes = ui.writes(); expect(writes).toHaveLength(1);
    const saved = matter(fs.readFileSync(path.join(postsDir, `${writes[0]!.body.slug}.md`), "utf8"));
    expect(saved.data.draft).toBe(true);
    expect(saved.data.slug).not.toBe("source-post");
    expect(ui.element("saveOutcome").textContent).toContain("Saved draft");
  });
});

describe('Generator embedded hero target', () => {
  it('starts locked, activates only the final saved slug, and ignores JSON edits and copy-as-template', async () => {
    let saved = 0;
    const ui = setup(request => request.url.pathname === '/ingest' && !request.dry ? response({ok:true,saved:true,slug:++saved === 1 ? 'collision-resolved-slug' : 'second-saved-slug'}) : undefined);
    const root = ui.window.document.querySelector<HTMLElement>('[data-hero-workflow]')!;
    expect(root.querySelector<HTMLElement>('[data-workspace]')!.hidden).toBe(true);
    expect(root.textContent).toContain('available after this post is saved');
    ui.edit(createPostSpec({slug:'pasted-slug'})); ui.click('ingestBtn'); await ui.idle();
    await vi.waitFor(() => expect(root.querySelector<HTMLElement>('[data-workspace]')!.hidden).toBe(false));
    expect(root.dataset.heroSlug).toBe('collision-resolved-slug');
    ui.edit(createPostSpec({slug:'unsaved-edits'})); expect(root.dataset.heroSlug).toBe('collision-resolved-slug');
    ui.window.document.querySelector<HTMLButtonElement>('[data-recent-insert]')!.click();
    expect(root.dataset.heroSlug).toBe('collision-resolved-slug');
    ui.click('ingestBtn'); await ui.idle(); expect(root.dataset.heroSlug).toBe('second-saved-slug');
    expect(ui.requests.filter(r=>r.url.pathname==='/posts/load').map(r=>r.body.slug)).toEqual(['collision-resolved-slug','second-saved-slug']);
  });
  it('keeps hero optional on a failed load and hides the entire step for curses', async () => {
    const ui = setup(request=>request.url.pathname==='/posts/load'?response({ok:false,error:'Unavailable'},false):undefined);
    ui.edit(createPostSpec()); ui.click('ingestBtn'); await ui.idle();
    expect(ui.element('saveOutcome').textContent).toContain('Saved draft');
    await vi.waitFor(()=>expect(ui.window.document.querySelector('[data-workflow-status]')!.textContent).toContain('could not be loaded'));
    ui.window.document.querySelector<HTMLButtonElement>('[data-panel-toggle="curses"]')!.click();
    expect(ui.window.document.querySelector('[data-generator-hero]')!.classList.contains('hidden')).toBe(true);
    expect(ui.element<HTMLButtonElement>('ingestBtn').disabled).toBe(false);
  });
  it('does not activate hero for template copying or an unconfirmed save', async () => {
    const ui = setup(request=>request.url.pathname==='/ingest'&&!request.dry?response({ok:true,saved:false}):undefined);
    await vi.waitFor(()=>expect(ui.window.document.querySelector('[data-recent-insert]')).not.toBeNull());
    ui.window.document.querySelector<HTMLButtonElement>('[data-recent-insert]')!.click();
    expect(ui.window.document.querySelector<HTMLElement>('[data-workspace]')!.hidden).toBe(true);
    ui.edit(createPostSpec());ui.click('ingestBtn');await ui.idle();
    expect(ui.requests.some(r=>r.url.pathname==='/posts/load')).toBe(false);
  });
});

let tempDir: string;
let cwdSpy: MockInstance<() => string> | undefined;
let prepareSpecForPersistence: (
  payload: any,
  options?: Record<string, unknown>,
) => any;
let persistPreparedSpec: (
  prepared: any,
) => Promise<{ postPath: string; createdEntities: string[] }>;

async function prepareTempDir() {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "wc-admin-generator-"));
  await fsp.mkdir(path.join(tempDir, "src", "content", "posts"), { recursive: true });
  await fsp.mkdir(path.join(tempDir, "content", "posts"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd");
  cwdSpy.mockReturnValue(tempDir);
}

async function cleanupTempDir() {
  if (cwdSpy) cwdSpy.mockRestore();
  if (tempDir) {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

describe("admin post generator pipeline", () => {
  beforeEach(async () => {
    await prepareTempDir();
    vi.resetModules();
    ({ prepareSpecForPersistence, persistPreparedSpec } = await import("../dev-api.js"));
  });

  afterEach(async () => {
    await cleanupTempDir();
    vi.resetModules();
  });

  it("normalizes specs, reports adjustments, and persists markdown", async () => {
    const postsDir = path.join(tempDir, "src", "content", "posts");
    await fsp.writeFile(path.join(postsDir, "cozy-focus-tea.md"), "# existing\n", "utf8");

    const rawSpec = {
      specVersion: "1",
      title: " Cozy Focus Tea ",
      slug: "Cozy Focus Tea",
      excerpt: "  Quick focus tea summary. ",
      summary: " Quick focus tea summary. ",
      tags: ["Focus ", " cozy", "ritual", "tea"],
      sections: [
        { heading: "Opening Reflection", markdown: "A gentle opening." },
        { heading: "Quick Ritual", title: "Quick Ritual", content: "Quick ritual steps include a Focus tea ritual mention." },
        { heading: "Deep Dive", markdown: "A longer companion ritual that feels like a deep dive ritual." },
        { heading: "Ritual Checklist", markdown: "- Checklist items anchor for quick packing with Enamel mug on hand." },
        { heading: "Reflection Prompt", markdown: "Reflection prompt question anchor for journaling." },
      ],
      outline: [
        { heading: "Opening Reflection", id: "opening-reflection" },
        { heading: "Quick Ritual", id: "quick-ritual" },
        { heading: "Deep Dive", id: "deep-dive" },
        { heading: "Ritual Checklist", id: "ritual-checklist" },
        { heading: "Reflection Prompt", id: "reflection-prompt" },
      ],
      entities: [
        { type: "herb", slug: "Peppermint" },
        { type: "crystal", name: "Fluorite" },
        { type: "herb", slug: "" },
      ],
      heroImagePrompt: "A cozy desk with tea.",
      altTexts: ["A warm mug"],
      internalLinkHints: [
        { anchor: "Focus tea ritual", rationale: "Link to breathing guide." },
        { anchor: "Checklist items anchor", rationale: "Link to supply checklist." },
        { anchor: "Reflection prompt question", rationale: "Link to journaling prompts." },
        { anchor: "Deep dive ritual", rationale: "Link to deep ritual guide." },
        { anchor: "Quick ritual steps", rationale: "Link to quick ritual." },
      ],
      affiliateHints: [
        { key: "mug", anchor: "Enamel mug", rationale: "Suggest favorite mug." },
        { key: "invalid", anchor: "" },
      ],
      cta: { type: "kofi" },
      adPlacements: ["Lead", "footer", "mid"],
    };

    const prepared = prepareSpecForPersistence(rawSpec, {
      cwd: tempDir,
      postsDirectories: [
        path.join(tempDir, "src", "content", "posts"),
        path.join(tempDir, "content", "posts"),
      ],
    });

    expect(prepared.spec.slug).toBe("cozy-focus-tea-2");
    expect(prepared.spec.title).toBe("Cozy Focus Tea");
    expect(prepared.spec.excerpt).toBe("Quick focus tea summary.");
    expect(prepared.spec.metaDescription).toBe("Quick focus tea summary.");
    expect(prepared.spec.tags).toEqual(["Focus", "cozy", "ritual", "tea"]);
    expect(prepared.spec.entities).toEqual([
      { type: "herb", slug: "peppermint" },
      { type: "crystal", slug: "fluorite" },
    ]);
    expect(prepared.spec.internalLinkHints).toHaveLength(5);
    expect(prepared.spec.internalLinkHints.map((hint: any) => hint.anchor)).toEqual(
      expect.arrayContaining([
        "Focus tea ritual",
        "Checklist items anchor",
        "Reflection prompt question",
        "Deep dive ritual",
        "Quick ritual steps",
      ]),
    );
    expect(prepared.spec.affiliateHints).toHaveLength(1);
    expect(prepared.spec.adPlacements).toEqual(["lead", "mid"]);
    expect(prepared.spec.cta.type).toBe("kofi");
    expect(prepared.spec.outline).toHaveLength(5);
    expect(prepared.spec.heroImagePrompt).toBe("A cozy desk with tea.");

    expect(prepared.normalizationReport).toEqual(
      expect.arrayContaining([
        expect.stringContaining("summary→metaDescription"),
        expect.stringContaining("sections.content"),
        expect.stringContaining("slug→cozy-focus-tea-2"),
      ]),
    );

    expect(prepared.post.filePath.endsWith("cozy-focus-tea-2.md")).toBe(true);
    expect(prepared.post.contents).toContain('title: "Cozy Focus Tea"');
    expect(prepared.post.contents).toContain('slug: "cozy-focus-tea-2"');
    expect(prepared.post.contents).toContain('metaDescription: "Quick focus tea summary."');
    expect(prepared.post.contents).toContain('heroImagePrompt: "A cozy desk with tea."');
    expect(prepared.post.contents).toContain("includeAds: true");
    expect(prepared.post.contents).toContain("includeKofi: true");
    expect(prepared.post.contents).toContain('outline: ["Opening Reflection","Quick Ritual","Deep Dive","Ritual Checklist","Reflection Prompt"]');

    await persistPreparedSpec(prepared);

    const saved = await fsp.readFile(path.join(postsDir, "cozy-focus-tea-2.md"), "utf8");
    expect(saved).toBe(prepared.post.contents);
    expect(saved).toContain('heroImagePrompt: "A cozy desk with tea."');

    const herbStub = await fsp.readFile(
      path.join(tempDir, "content", "entities", "herb", "peppermint.json"),
      "utf8",
    );
    const crystalStub = await fsp.readFile(
      path.join(tempDir, "content", "entities", "crystal", "fluorite.json"),
      "utf8",
    );

    expect(JSON.parse(herbStub).slug).toBe("peppermint");
    expect(JSON.parse(crystalStub).slug).toBe("fluorite");
  });
});
