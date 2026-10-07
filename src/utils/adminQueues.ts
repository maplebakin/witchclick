/** Read-only, snapshot-based preparation checks. These are not editorial approval. */
export const queueDefinitions = [
  { id: "decision", title: "Needs decision", empty: "No placeholders need a decision." },
  { id: "work", title: "Drafts needing work", empty: "No drafts need preparation work." },
  { id: "heroes", title: "Missing heroes", empty: "No content-complete items are waiting for artwork." },
  { id: "ready", title: "Checks passed — final review needed", empty: "No drafts have passed every preparation check yet." },
  { id: "recent", title: "Recently published", empty: "No public-eligible posts to show yet." },
] as const;

export type QueueId = typeof queueDefinitions[number]["id"];
export interface QueuePost {
  slug: string;
  data?: Record<string, unknown>;
  content?: string;
  readError?: string;
  artwork?: { src?: string; alt?: string; availability: "present" | "missing" | "unknown" };
}
export interface QueueStub { slug: string; stubTriageStatus?: string; title?: string }
export interface QueueItem {
  slug: string;
  title: string;
  contentType: string;
  state: string;
  reason: string;
  blockers: string[];
  href: string;
  action: string;
  timestamp: number;
}
export type AdminQueues = Record<QueueId, QueueItem[]>;
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const placeholder = /automatically created as a stub|\b(?:placeholder|coming soon|check back soon|nothing here yet|lore in progress)\b/i;
const unfinished = /\b(?:TODO|TBD|FIXME)\b|\[(?:insert|add|write)\b[^\]]*\]/i;

/** Mirrors the public loader's date precedence, with invalid dates treated conservatively. */
function publicationDate(data: Record<string, unknown>) {
  let supplied = false;
  for (const key of ["publishDate", "publishedAt", "pubDate", "date"]) {
    const value = data[key];
    if (value == null || value === "") continue;
    supplied = true;
    if (!(typeof value === "string" || value instanceof Date)) continue;
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return { timestamp, invalid: false };
  }
  return { timestamp: 0, invalid: supplied };
}

export function classifyAdminQueues(posts: QueuePost[], stubs: QueueStub[], now = Date.now()): AdminQueues {
  const queues: AdminQueues = { decision: [], work: [], heroes: [], ready: [], recent: [] };
  const stubMap = new Map(stubs.map((stub) => [stub.slug, stub]));
  const grouped = new Map<string, QueuePost[]>();
  for (const post of posts) grouped.set(post.slug, [...(grouped.get(post.slug) ?? []), post]);
  // Include detector-only entries rather than silently losing an unreadable placeholder.
  for (const stub of stubs) if (!grouped.has(stub.slug)) grouped.set(stub.slug, [{ slug: stub.slug, readError: "Post source unavailable" }]);

  for (const [slug, records] of grouped) {
    const post = records[0]!;
    const data = post.data ?? {};
    const stub = stubMap.get(slug);
    const tags = Array.isArray(data.tags) ? data.tags.map((tag) => text(tag).toLowerCase()) : text(data.tags).toLowerCase().split(/[,\s]+/);
    const isStub = !!stub || tags.some((tag) => ["stub", "placeholder"].includes(tag)) || placeholder.test(`${post.content ?? ""}\n${text(data.metaDescription)}\n${text(data.excerpt)}`);
    const date = publicationDate(data);
    const scheduled = date.timestamp > now;
    const draft = data.draft === true || data.published === false;
    const problems: string[] = [];
    const unknown: string[] = [];
    if (records.length > 1) unknown.push("Duplicate slug: source identity needs review");
    if (post.readError || !post.data || typeof post.content !== "string") unknown.push(post.readError || "Post source or body unavailable");
    if (date.invalid) unknown.push("Publication date cannot be parsed");
    for (const key of ["draft", "published"]) if (data[key] != null && typeof data[key] !== "boolean") unknown.push(`Invalid ${key} flag`);
    if (!text(data.title)) problems.push("Missing title");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) problems.push("Invalid slug");
    if (!text(data.metaDescription)) problems.push("Missing meta description");
    if (!tags.some(Boolean)) problems.push("Missing tags");
    if (draft && !date.timestamp && !date.invalid) problems.push("Missing publication date");
    if (data.published === false) problems.push("published:false blocks public eligibility; review publication settings in Posts");
    if (typeof post.content === "string") {
      const body = post.content.replace(/<!--[\s\S]*?-->/g, "").replace(/[#*_`\s]/g, "");
      if (!body) problems.push("Empty post body");
      if (unfinished.test(post.content)) problems.push("Unfinished template markers in body");
    }
    if (scheduled) problems.push("Future publication date: review scheduling before publishing");
    const art = post.artwork;
    const artProblems: string[] = [];
    if (!art?.src) artProblems.push("Missing hero image");
    else if (art.availability === "missing") artProblems.push("Hero file is missing");
    else if (art.availability !== "present") unknown.push("Hero availability cannot be verified");
    if (!art?.alt) artProblems.push("Missing hero alt text");
    const item: QueueItem = {
      slug, title: text(data.title) || stub?.title || slug,
      contentType: text(data.contentType) || "Post",
      state: isStub ? "Placeholder / stub" : unknown.length ? "Unknown" : scheduled ? "Scheduled" : draft ? "Draft" : "Public-eligible",
      reason: "", blockers: [...unknown, ...problems, ...artProblems],
      href: `/admin/posts?slug=${encodeURIComponent(slug)}`, action: "Open Posts", timestamp: date.timestamp,
    };
    let queue: QueueId;
    if (isStub) {
      queue = "decision";
      const triage = text(stub?.stubTriageStatus) || text(data.stubTriageStatus);
      item.reason = triage ? `Stub triage: ${triage.replace(/-/g, " ")}. Confirm its next step in Post Stub Forge.` : "Placeholder content has no triage decision yet.";
      item.href = "/admin/stubs"; item.action = "Open Post Stub Forge";
    } else if (unknown.length || ((draft || scheduled) && problems.length)) {
      queue = "work";
      item.reason = [...unknown, ...problems].join("; ");
      item.blockers = artProblems;
    } else if (!problems.length && artProblems.length) {
      queue = "heroes";
      item.reason = `Content preparation checks passed; ${artProblems.join("; ").toLowerCase()}.`;
      item.blockers = [];
      item.href = `/admin/hero?post=${encodeURIComponent(slug)}`; item.action = "Open Hero";
    } else if (draft) {
      queue = "ready";
      item.reason = "Source, metadata, body, publication flags and hero checks passed. Editorial approval is still required.";
      item.href = `/admin/staging?slug=${encodeURIComponent(slug)}`; item.action = "Open Staging";
    } else {
      queue = "recent";
      item.reason = date.timestamp ? `Public-eligible since ${new Date(date.timestamp).toISOString().slice(0, 10)}.` : "Public-eligible; publication date is not recorded.";
    }
    queues[queue].push(item);
  }
  for (const definition of queueDefinitions) queues[definition.id].sort((a, b) => definition.id === "recent" ? b.timestamp - a.timestamp || a.title.localeCompare(b.title) : a.title.localeCompare(b.title));
  return queues;
}
