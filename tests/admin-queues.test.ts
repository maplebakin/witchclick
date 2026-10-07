import fs from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { classifyAdminQueues, queueDefinitions, type QueuePost } from "../src/utils/adminQueues";

const now = Date.parse("2026-10-06T12:00:00Z");
const complete = (slug = "complete", overrides: Partial<QueuePost> = {}): QueuePost => ({
  slug,
  data: { title: "Complete post", metaDescription: "A grounding practice.", tags: ["grounding"], publishedAt: "2026-10-01", draft: true },
  content: "## Practice\nPause and breathe. Notice what you can see and hear.\n## Reflection\nWrite down what helped.",
  artwork: { src: "/images/hero.jpg", alt: "A journal beside a candle", availability: "present" },
  ...overrides,
});
const allItems = (queues: ReturnType<typeof classifyAdminQueues>) => Object.values(queues).flat();
const classify = (post: QueuePost) => classifyAdminQueues([post], [], now);

describe("admin work queue classification", () => {
  it("keeps queue priority explicit and counts empty queues", () => {
    expect(queueDefinitions.map((queue) => queue.id)).toEqual(["decision", "work", "heroes", "ready", "recent"]);
    expect(Object.values(classifyAdminQueues([], [], now)).every((items) => items.length === 0)).toBe(true);
    expect(queueDefinitions.every((queue) => queue.empty.length > 0)).toBe(true);
  });
  it.each(["needs-human-decision", "human-decision", "template-section-artifact", "template-artifact", "editorial-seed", "possible-delete-merge-candidate", "possible-delete-merge", "strong-article-candidate", "support-reference-candidate", "pop-culture-review", ""])("separates stub triage %s from real drafts", (triage) => {
    const queues = classifyAdminQueues([complete("stub", { artwork: undefined })], [{ slug: "stub", stubTriageStatus: triage }], now);
    expect(queues.decision).toHaveLength(1);
    expect(queues.decision[0]).toMatchObject({ state: "Placeholder / stub", href: "/admin/stubs?slug=stub", action: "Open Post Stub Forge" });
    expect(queues.decision[0]!.blockers).toContain("Missing hero image");
    expect(allItems(queues)).toHaveLength(1);
    expect(queues.ready).toHaveLength(0);
  });
  it("URL-encodes the exact stub slug in the Dashboard action", () => {
    const slug = "idea with spaces/&";
    const item = classifyAdminQueues([complete(slug)], [{ slug }], now).decision[0]!;
    expect(item.href).toBe(`/admin/stubs?slug=${encodeURIComponent(slug)}`);
    expect(item.action).toBe("Open Post Stub Forge");
  });
  it.each(["stub", "placeholder"])("recognizes %s tags even without a detector entry", (tag) => {
    expect(classify(complete("tagged", { data: { ...complete().data, tags: [tag] } })).decision).toHaveLength(1);
  });
  it("recognizes placeholder body and metadata even if falsely marked public", () => {
    for (const overrides of [
      { content: "Automatically created as a stub. Content coming soon." },
      { data: { ...complete().data, draft: false, metaDescription: "Placeholder post" } },
    ]) expect(classify(complete("placeholder", overrides)).decision).toHaveLength(1);
  });
  it("puts detected draft problems before missing artwork", () => {
    const queues = classify(complete("needs-work", { content: "TODO: insert the practice", artwork: undefined }));
    expect(queues.work[0]!.reason).toContain("Unfinished template markers");
    expect(queues.work[0]!.blockers).toContain("Missing hero image");
    expect(queues.work[0]!.href).toBe("/admin/posts?slug=needs-work");
    expect(queues.heroes).toHaveLength(0);
  });
  it.each(["title", "metaDescription", "tags", "publishedAt"])("blocks readiness without %s", (key) => {
    const data = { ...complete().data }; delete data[key];
    expect(classify(complete("incomplete", { data })).work).toHaveLength(1);
  });
  it("uses the actual body rather than a stored word count", () => {
    expect(classify(complete("empty", { content: "<!-- unfinished -->\n##", data: { ...complete().data, wordCount: 2000 } })).work[0]!.reason).toContain("Empty post body");
  });
  it("routes content-complete drafts and public posts with artwork-only blockers to Hero", () => {
    for (const draft of [true, false]) {
      const queues = classify(complete("hero", { data: { ...complete().data, draft }, artwork: undefined }));
      expect(queues.heroes[0]).toMatchObject({ href: "/admin/hero?post=hero", action: "Open Hero" });
      expect(allItems(queues)).toHaveLength(1);
    }
  });
  it.each([
    { src: "/missing.jpg", alt: "A candle", availability: "missing" as const },
    { src: "/hero.jpg", alt: "", availability: "present" as const },
  ])("treats absent files and absent alt text as artwork blockers", (artwork) => {
    expect(classify(complete("art", { artwork })).heroes).toHaveLength(1);
  });
  it("requires verifiable artwork and never labels unknown readiness as ready", () => {
    const queues = classify(complete("remote", { artwork: { src: "https://example.com/hero.jpg", alt: "A candle", availability: "unknown" } }));
    expect(queues.work[0]).toMatchObject({ state: "Unknown" });
    expect(queues.work[0]!.reason).toContain("Hero availability cannot be verified");
    expect(queues.ready).toHaveLength(0);
  });
  it.each([
    { data: undefined, readError: "Source unavailable" },
    { content: undefined },
    { data: { ...complete().data, publishedAt: "not-a-date" } },
    { data: { ...complete().data, draft: "false" } },
    { data: { ...complete().data, published: "true" } },
  ])("routes unknown source/flags/date to work with an honest reason", (overrides) => {
    const queues = classify(complete("unknown", overrides));
    expect(queues.work[0]!.state).toBe("Unknown");
    expect(queues.work[0]!.reason).not.toBe("");
    expect(queues.ready).toHaveLength(0);
  });
  it("honors published:false and future dates", () => {
    for (const draft of [true, false]) {
      const unpublished = classify(complete("unpublished", { data: { ...complete().data, draft, published: false } }));
      expect(unpublished.work[0]!.reason).toContain("published:false blocks public eligibility");
      expect(unpublished.ready).toHaveLength(0);
    }
    const queues = classify(complete("future", { data: { ...complete().data, draft: false, publishDate: "2027-01-01" } }));
    expect(queues.work[0]!.state).toBe("Scheduled");
    expect(queues.recent).toHaveLength(0);
  });
  it("follows public date precedence and orders recent posts newest first", () => {
    const queues = classifyAdminQueues([
      complete("old", { data: { ...complete().data, draft: false } }),
      complete("new", { data: { ...complete().data, draft: false, publishDate: "2026-10-05", publishedAt: "2027-01-01" } }),
    ], [], now);
    expect(queues.recent.map((item) => item.slug)).toEqual(["new", "old"]);
  });
  it("requires final editorial review even after preparation checks pass", () => {
    expect(classify(complete()).ready[0]).toMatchObject({ state: "Draft", href: "/admin/staging?slug=complete", action: "Open Staging" });
    expect(classify(complete()).ready[0]!.reason).toContain("Editorial approval is still required");
  });
  it("deduplicates slugs conservatively and includes detector-only stubs", () => {
    const queues = classifyAdminQueues([complete("duplicate"), complete("duplicate")], [{ slug: "lost", title: "Lost stub" }], now);
    expect(queues.work[0]!.state).toBe("Unknown");
    expect(queues.decision[0]!.slug).toBe("lost");
    expect(allItems(queues)).toHaveLength(2);
  });
  it("assigns every mixed fixture exactly one primary queue without mutating inputs", () => {
    const posts = [complete("stub"), complete("work", { content: "TBD" }), complete("hero", { artwork: undefined }), complete("ready"), complete("public", { data: { ...complete().data, draft: false } })];
    const original = JSON.stringify(posts);
    const queues = classifyAdminQueues(posts, [{ slug: "stub" }], now);
    expect(Object.values(queues).map((items) => items.length)).toEqual([1, 1, 1, 1, 1]);
    expect(new Set(allItems(queues).map((item) => item.slug)).size).toBe(posts.length);
    expect(JSON.stringify(posts)).toBe(original);
  });
});

describe("Dashboard routing and snapshot states", () => {
  const source = fs.readFileSync(new URL("../src/pages/admin/index.astro", import.meta.url), "utf8");
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)![1]!;
  const fixture = (template = '<div hidden data-queue-template><section data-queue="ready">Checks passed — final review needed</section></div>') => new JSDOM(`<div data-dashboard-root><div data-queue-status>Loading work queues…</div><div data-queue-host aria-busy="true"></div>${template}</div>`, { runScripts: "outside-only" });
  it("has no write API or Dashboard publication control", () => {
    expect(source).not.toMatch(/fetch\(|\/ingest|\/publish|\/delete|\/save|\/replace/);
    expect(source).toContain("Open by Slug");
    expect(source).toContain("Generate a post");
    expect(source).toContain("Write a post");
  });
  it("keeps loading honest before the snapshot is displayed", () => {
    const dom = fixture();
    expect(dom.window.document.querySelector("[data-queue-host]")!.getAttribute("aria-busy")).toBe("true");
    expect(dom.window.document.querySelector("[data-queue-status]")!.textContent).toContain("Loading");
    dom.window.eval(script);
    expect(dom.window.document.querySelector("[data-queue-host] [data-queue]")).not.toBeNull();
    expect(dom.window.document.querySelector("[data-queue-host]")!.getAttribute("aria-busy")).toBe("false");
    dom.window.close();
  });
  it("shows source failures as unknown, without a ready queue", () => {
    const dom = fixture('<div hidden data-queue-template data-source-error="Unavailable"><p role="alert">Readiness is unknown: source unavailable.</p></div>');
    dom.window.eval(script);
    expect(dom.window.document.querySelector("[data-queue-status]")!.textContent).toContain("unknown");
    expect(dom.window.document.querySelector('[data-queue="ready"]')).toBeNull();
    dom.window.close();
  });
  it("shows a missing snapshot as unknown", () => {
    const dom = fixture(""); dom.window.eval(script);
    expect(dom.window.document.querySelector("[data-queue-status]")!.textContent).toContain("Readiness is unknown");
    dom.window.close();
  });
});
