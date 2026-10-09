import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listGet } from "../src/pages/api/staging/list.json";
import { POST as previewPost } from "../src/pages/api/staging/preview.json";
import { POST as publishPost } from "../src/pages/api/staging/publish.json";
import { POST as deletePost } from "../src/pages/api/staging/delete.json";
import { classifyAdminQueues, getStagingReadiness } from "../src/utils/adminQueues";
import { readAllPostRecords } from "../src/utils/postFiles";

const pageSource = fs.readFileSync(new URL("../src/pages/admin/staging.astro", import.meta.url), "utf8");
const pageScript = pageSource.match(/<script is:inline>([\s\S]*?)<\/script>/)![1]!;
let root = "";
const windows: JSDOM[] = [];
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "wc-staging-readiness-"));
  fs.mkdirSync(path.join(root, "src/content/posts"), { recursive: true });
  fs.mkdirSync(path.join(root, "public/images"), { recursive: true });
  fs.writeFileSync(path.join(root, "public/images/hero.png"), "disposable artwork fixture");
  vi.spyOn(process, "cwd").mockReturnValue(root);
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("VITEST", "true");
  vi.stubEnv("WITCHCLICK_STAGING_LOOPBACK", "1"); vi.stubEnv("ADMIN_API_TOKEN", "fixture-token");
});
afterEach(() => {
  windows.splice(0).forEach((dom) => dom.window.close());
  vi.restoreAllMocks(); vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});
function write(slug: string, data: Record<string, unknown> = {}, content = "## Practice\nPause and breathe. Notice the room around you.\n## Reflection\nWrite down what helped.", filename = slug) {
  const frontmatter = { slug, title: `Title ${slug}`, draft: true, metaDescription: "A complete grounding practice with room for reflection.", tags: ["focus"], publishedAt: "2025-01-01", heroImage: "/images/hero.png", heroAlt: "A journal on a desk", ...data };
  const file = path.join(root, "src/content/posts", `${filename}.md`);
  fs.writeFileSync(file, matter.stringify(content, frontmatter));
  return file;
}
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost:4321/api/staging/action.json", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const list = async () => (await (await listGet({ request: request({}) })).json()).drafts;
const publish = (slug: string, extra: Record<string, unknown> = {}) => publishPost({ request: request({ slug, ...extra }) });

describe("Staging readiness on current disposable records", () => {
  it("annotates all five readiness states while preserving every existing list field", async () => {
    const metadata = { topic: "Shared topic", requestedWords: 800, deliveredWords: 700, generatedAt: "2025-01-01" };
    write("ready", { excerpt: "Preserved excerpt", wordCount: 700, readingMinutes: 4, promptMetadata: metadata });
    write("work", {}, "TODO: finish this practice");
    write("hero", { heroImage: null, heroAlt: null });
    write("stub", { tags: ["stub"] });
    write("unknown", { heroImage: "https://example.com/unverified.png" });
    const drafts = await list();
    expect(Object.fromEntries(drafts.map((draft: any) => [draft.slug, draft.state]))).toEqual({ ready: "checks-passed", work: "needs-work", hero: "missing-hero", stub: "placeholder-stub", unknown: "unknown" });
    expect(drafts.find((draft: any) => draft.slug === "ready")).toMatchObject({ slug: "ready", title: "Title ready", excerpt: "Preserved excerpt", tags: ["focus"], wordCount: 700, readingMinutes: 4, publishedAt: "2025-01-01", filePath: "src/content/posts/ready.md", promptMetadata: metadata });
    for (const draft of drafts) { expect(draft.reasons.length).toBeGreaterThan(0); expect(Array.isArray(draft.blockers)).toBe(true); }
  });
  it.each([
    [{ tags: ["placeholder"] }, "A seemingly finished body."],
    [{}, "This was automatically created as a stub. Content coming soon."],
    [{ metaDescription: "Placeholder post" }, "A seemingly finished body."],
  ])("rejects placeholders even with forged ready claims", async (data, content) => {
    const file = write("placeholder", data, content); const before = fs.readFileSync(file, "utf8");
    const response = await publish("placeholder", { state: "checks-passed", ready: true, acknowledgeMissingHero: true });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "NOT_READY", details: { state: "placeholder-stub" } });
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  it("rejects a file changed into a placeholder after preview", async () => {
    write("changed");
    expect((await previewPost({ request: request({ slug: "changed" }) })).status).toBe(200);
    const file = write("changed", { tags: ["stub"] }, "Automatically created as a stub.");
    const current = fs.readFileSync(file, "utf8");
    expect((await publish("changed", { ready: true })).status).toBe(409);
    expect(fs.readFileSync(file, "utf8")).toBe(current);
  });
  it.each([
    [{ metaDescription: "" }, "Finished body.", "Missing meta description", "needs-work"],
    [{}, "<!-- not content -->\n##", "Empty post body", "needs-work"],
    [{}, "TBD: finish this practice", "Unfinished template markers", "needs-work"],
    [{ publishedAt: "invalid-date" }, "Finished body.", "Publication date cannot be parsed", "unknown"],
    [{ heroImage: "https://example.com/hero.png" }, "Finished body.", "Hero availability cannot be verified", "unknown"],
  ])("rejects incomplete or unknown preparation without writes", async (data, content, reason, state) => {
    const file = write("blocked", data as Record<string, unknown>, content); const before = fs.readFileSync(file, "utf8");
    const response = await publish("blocked"); const payload = await response.json();
    expect(response.status).toBe(409); expect(payload.error).toContain(reason);
    expect(payload.details.state).toBe(state); expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  it("requires acknowledgment for artwork-only publication and reports its warning", async () => {
    const file = write("no-hero", { heroImage: null, heroAlt: null }); const before = fs.readFileSync(file, "utf8");
    expect((await publish("no-hero")).status).toBe(409); expect(fs.readFileSync(file, "utf8")).toBe(before);
    const response = await publish("no-hero", { acknowledgeMissingHero: true }); const payload = await response.json();
    expect(response.status).toBe(200); expect(payload).toMatchObject({ missingHero: true, publiclyEligibleLocally: true });
    expect(payload.warnings.join(" ")).toContain("missing hero image");
    expect(matter(fs.readFileSync(file, "utf8")).data.draft).toBe(false);
  });
  it("rechecks artwork removed after listing, rather than trusting the ready annotation", async () => {
    const file = write("lost-art"); expect((await list())[0].state).toBe("checks-passed");
    fs.unlinkSync(path.join(root, "public/images/hero.png"));
    const response = await publish("lost-art"); expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "HERO_ACK_REQUIRED" });
    expect(matter(fs.readFileSync(file, "utf8")).data.draft).toBe(true);
  });
  it("publishes a checks-passed draft locally and preserves its body", async () => {
    const file = write("eligible"); const before = matter(fs.readFileSync(file, "utf8"));
    const response = await publish("eligible"); const payload = await response.json();
    expect(response.status).toBe(200); expect(payload.publiclyEligibleLocally).toBe(true);
    expect(payload.message).toContain("publicly eligible locally"); expect(payload.visibilityBlockers).toEqual([]);
    const after = matter(fs.readFileSync(file, "utf8")); expect(after.data.draft).toBe(false); expect(after.content.trim()).toBe(before.content.trim());
  });
  it("preserves visibility flags and reports remaining blockers without changing Dashboard queues", async () => {
    const file = write("visibility", { published: false, publishDate: "2099-01-01" });
    const records = readAllPostRecords(path.join(root, "src/content/posts"));
    expect(classifyAdminQueues(records, []).work).toHaveLength(1);
    const readiness = getStagingReadiness(records, root).get("visibility")!;
    expect(readiness.state).toBe("checks-passed"); expect(readiness.visibilityBlockers).toEqual(["published:false", "Future publication date"]);
    const response = await publish("visibility"); const payload = await response.json();
    expect(response.status).toBe(200); expect(payload.publiclyEligibleLocally).toBe(false);
    expect(payload.message).toContain("not publicly eligible locally"); expect(payload.visibilityBlockers).toEqual(["published:false", "Future publication date"]);
    const saved = matter(fs.readFileSync(file, "utf8")); expect(saved.data.published).toBe(false); expect(saved.data.publishDate).toBe("2099-01-01");
  });
  it("rejects duplicate slug identities as unknown", async () => {
    const file = write("duplicate"); write("duplicate", {}, "Other body.", "duplicate-other");
    const before = fs.readFileSync(file, "utf8"); const response = await publish("duplicate");
    expect(response.status).toBe(409); expect((await response.json()).error).toContain("Duplicate slug"); expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  it("fails closed on malformed current source without changing the file", async () => {
    const file = write("broken"); fs.writeFileSync(file, '---\ntitle: [broken\n---\nBody.');
    const before = fs.readFileSync(file, "utf8"); const response = await publish("broken");
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "READINESS_UNKNOWN", details: { state: "unknown" } });
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  it("preserves non-draft publish/delete guards", async () => {
    const file = write("public", { draft: false }); const before = fs.readFileSync(file, "utf8");
    expect((await publish("public")).status).toBe(400);
    expect((await deletePost({ request: request({ slug: "public" }) })).status).toBe(400);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  it("keeps Phase 3A authorization and production behavior", async () => {
    const file = write("auth"); const before = fs.readFileSync(file, "utf8"); vi.stubEnv("WITCHCLICK_STAGING_LOOPBACK", "0");
    expect((await publish("auth")).status).toBe(401); expect(fs.readFileSync(file, "utf8")).toBe(before);
    expect((await publishPost({ request: request({ slug: "auth" }, { Authorization: "Bearer fixture-token" }) })).status).toBe(200);
    vi.stubEnv("NODE_ENV", "production"); expect((await publish("auth")).status).toBe(404);
  });
});

function setupBrowser(drafts: any[], handler?: (url: string, body: any) => Promise<Response | undefined> | Response | undefined) {
  const dom = new JSDOM(`<div data-staging-root>
    <div id="draftsList"></div><span id="draftCount"></span><input id="draftSearch" /><button id="clearDraftSearch"></button><input type="checkbox" id="groupByTopic" />
    <select id="readinessFilter">${["all", "checks-passed", "needs-work", "missing-hero", "placeholder-stub", "unknown"].map((state) => `<option>${state}</option>`).join("")}</select>
    <p id="stagingStatus"></p><button id="refreshBtn"></button><button id="closeCompare"></button><button id="closePreview"></button>
    <section id="comparisonSection" class="hidden"><div id="comparisonContent"></div></section><section id="previewSection" class="hidden"><h2 id="reviewTitle"></h2><div id="previewContent"></div><button id="publishSelectedBtn" disabled></button></section>
    </div>`, { runScripts: "outside-only", url: "http://localhost:4321/admin/staging" });
  windows.push(dom); dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.confirm = vi.fn(() => true); dom.window.alert = vi.fn();
  const calls: Array<{ url: string; body: any }> = [];
  const response = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  dom.window.fetch = vi.fn(async (input, options) => {
    const url = String(input); const body = JSON.parse(String(options?.body || "{}")); calls.push({ url, body });
    const custom = handler && await handler(url, body); if (custom) return custom;
    if (url.endsWith("/staging/list")) return response({ ok: true, drafts });
    if (url.endsWith("/staging/preview")) return response({ ok: true, slug: body.slug, frontmatter: { title: body.slug, tags: [], wordCount: 400, publishedAt: "2025-01-01" }, markdown: "## Practice\nBreathe." });
    return response({ ok: true, message: "Saved: publicly eligible locally. Not built or deployed." });
  });
  dom.window.eval(pageScript);
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => dom.window.document.getElementById(id) as T;
  return { dom, $, calls, loaded: async () => vi.waitFor(() => expect($("draftCount").textContent).toContain("draft")), idle: async () => vi.waitFor(() => expect($("draftsList").querySelectorAll(".preview-btn:disabled")).toHaveLength(0)) };
}
const uiDraft = (slug: string, state = "checks-passed") => ({ slug, title: `Title ${slug}`, excerpt: "Excerpt", tags: [], wordCount: 400, readingMinutes: 2, publishedAt: "2025-01-01", promptMetadata: { topic: "same topic" }, state, reasons: [`Reason for ${state}`], blockers: [], canPublish: ["checks-passed", "missing-hero"].includes(state) });

describe("Staging browser actions and server annotation filters", () => {
  it("uses the Astro annotated list and combines all readiness filters with search and topic grouping", async () => {
    const states = ["checks-passed", "needs-work", "missing-hero", "placeholder-stub", "unknown"];
    const ui = setupBrowser(states.map((state) => uiDraft(state, state))); await ui.loaded();
    expect(ui.calls[0]!.url).toBe("http://127.0.0.1:8787/staging/list");
    for (const state of states) {
      ui.$<HTMLSelectElement>("readinessFilter").value = state; ui.$("readinessFilter").dispatchEvent(new ui.dom.window.Event("change"));
      expect(ui.$("draftsList").querySelectorAll(".publish-btn")).toHaveLength(0);
      expect(ui.$("draftsList").textContent).toContain(`Reason for ${state}`);
      ui.$("draftsList").querySelector<HTMLButtonElement>(".preview-btn")!.click();
      await vi.waitFor(() => expect(ui.$("reviewTitle").textContent).toContain("Step 1"));
      expect(ui.$<HTMLButtonElement>("publishSelectedBtn").disabled).toBe(!["checks-passed", "missing-hero"].includes(state));
    }
    ui.$<HTMLInputElement>("draftSearch").value = "no match"; ui.$("draftSearch").dispatchEvent(new ui.dom.window.Event("input")); expect(ui.$("draftsList").textContent).toContain("No drafts match");
    ui.$<HTMLInputElement>("draftSearch").value = ""; ui.$<HTMLSelectElement>("readinessFilter").value = "all";
    ui.$<HTMLInputElement>("groupByTopic").checked = true; ui.$("groupByTopic").dispatchEvent(new ui.dom.window.Event("change")); expect(ui.$("draftsList").textContent).toContain("same topic");
  });
  it("keeps comparison read-only, with one action location and one request on repeated clicks", async () => {
    let release!: () => void; const wait = new Promise<void>((resolve) => { release = resolve; });
    const ui = setupBrowser([uiDraft("first"), uiDraft("second")], async (url) => {
      if (url.endsWith("/staging/publish")) { await wait; return new Response(JSON.stringify({ ok: true, message: "Saved: publicly eligible locally." })); }
      return undefined;
    });
    await ui.loaded(); ui.$<HTMLInputElement>("groupByTopic").checked = true; ui.$("groupByTopic").dispatchEvent(new ui.dom.window.Event("change"));
    ui.$("draftsList").querySelector<HTMLButtonElement>(".compare-topic-btn")!.click(); await vi.waitFor(() => expect(ui.$("comparisonContent").children).toHaveLength(2));
    expect(ui.$("comparisonContent").querySelectorAll("button")).toHaveLength(0);
    ui.$("draftsList").querySelector<HTMLButtonElement>('.preview-btn[data-slug="first"]')!.click();
    await vi.waitFor(() => expect(ui.$("reviewTitle").textContent).toContain("Step 1"));
    ui.$<HTMLButtonElement>("publishSelectedBtn").click();
    const pendingButton = ui.$<HTMLButtonElement>("publishSelectedBtn");
    expect(pendingButton.disabled).toBe(true); pendingButton.dispatchEvent(new ui.dom.window.Event("click", { bubbles: true }));
    expect(ui.$("draftsList").querySelector<HTMLButtonElement>('.delete-btn[data-slug="first"]')!.disabled).toBe(true);
    expect(ui.$("draftsList").querySelectorAll(".publish-btn")).toHaveLength(0);
    expect(ui.calls.filter((call) => call.url.endsWith("/staging/publish"))).toHaveLength(1);
    release(); await vi.waitFor(() => expect(ui.$("stagingStatus").textContent).toContain("publicly eligible locally"));
    await ui.idle();
  });
  it("requires explicit no-hero confirmation and sends acknowledgment only after acceptance", async () => {
    const ui = setupBrowser([uiDraft("art", "missing-hero")]); await ui.loaded();
    ui.$("draftsList").querySelector<HTMLButtonElement>(".preview-btn")!.click(); await vi.waitFor(() => expect(ui.$("reviewTitle").textContent).toContain("Step 1"));
    ui.dom.window.confirm = vi.fn(() => false); ui.$<HTMLButtonElement>("publishSelectedBtn").click();
    expect(ui.dom.window.confirm).toHaveBeenCalledWith(expect.stringContaining("publishing without a hero image")); expect(ui.calls.filter((call) => call.url.endsWith("/staging/publish"))).toHaveLength(0);
    ui.dom.window.confirm = vi.fn(() => true); ui.$<HTMLButtonElement>("publishSelectedBtn").click();
    await vi.waitFor(() => expect(ui.calls.find((call) => call.url.endsWith("/staging/publish"))?.body).toEqual({ slug: "art", acknowledgeMissingHero: true }));
    await ui.idle();
  });
  it("names the exact title and slug in permanent delete confirmation", async () => {
    const ui = setupBrowser([uiDraft("exact-slug")]); await ui.loaded(); ui.dom.window.confirm = vi.fn(() => false);
    ui.$("draftsList").querySelector<HTMLButtonElement>(".delete-btn")!.click();
    expect(ui.dom.window.confirm).toHaveBeenCalledWith('Permanently remove the draft file for “Title exact-slug” (exact-slug)? This cannot be undone.');
    expect(ui.calls.filter((call) => call.url.endsWith("/staging/delete"))).toHaveLength(0);
  });
  it("shows Phase 3A's locked message for unauthorized publication", async () => {
    const ui = setupBrowser([uiDraft("locked")], (url) => url.endsWith("/staging/publish") ? new Response("{}", { status: 401 }) : undefined); await ui.loaded();
    ui.$("draftsList").querySelector<HTMLButtonElement>(".preview-btn")!.click(); await vi.waitFor(() => expect(ui.$("reviewTitle").textContent).toContain("Step 1"));
    ui.$<HTMLButtonElement>("publishSelectedBtn").click(); await vi.waitFor(() => expect(ui.$("stagingStatus").textContent).toContain("Staging actions are locked"));
  });
});
