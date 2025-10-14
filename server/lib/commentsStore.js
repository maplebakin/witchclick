import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const COMMENTS_DIR = path.join(process.cwd(), "data", "community");
const COMMENTS_FILE = path.join(COMMENTS_DIR, "comments.json");

function defaultStore() {
  return { version: 1, posts: {} };
}

async function ensureStore() {
  await fs.mkdir(COMMENTS_DIR, { recursive: true });
  try {
    await fs.access(COMMENTS_FILE);
  } catch {
    await fs.writeFile(COMMENTS_FILE, JSON.stringify(defaultStore(), null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  try {
    const raw = await fs.readFile(COMMENTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultStore();
    if (!parsed.posts || typeof parsed.posts !== "object") parsed.posts = {};
    return parsed;
  } catch (error) {
    console.warn("Unable to read comments store", error);
    return defaultStore();
  }
}

async function writeStore(store) {
  await fs.writeFile(COMMENTS_FILE, JSON.stringify(store, null, 2), "utf8");
}

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.json$/i, "")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
}

function cleanAuthor(value) {
  const result = String(value ?? "").trim();
  return result.length > 80 ? result.slice(0, 80) : result;
}

function cleanMessage(value) {
  const result = String(value ?? "").trim();
  return result.length > 1000 ? result.slice(0, 1000) : result;
}

function createId() {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function sortByDateAsc(a, b) {
  const left = Date.parse(a.createdAt || "");
  const right = Date.parse(b.createdAt || "");
  return left - right;
}

export async function listComments(slug, options = {}) {
  const store = await readStore();
  const key = normalizeSlug(slug);
  const entries = Array.isArray(store.posts?.[key]) ? store.posts[key] : [];
  const includePending = options.includePending === true;
  const includeRejected = options.includeRejected === true;

  return entries
    .filter((entry) => {
      if (entry.status === "approved") return true;
      if (entry.status === "pending" && includePending) return true;
      if (entry.status === "rejected" && includeRejected) return true;
      return false;
    })
    .map((entry) => ({
      id: entry.id,
      author: entry.author,
      message: entry.message,
      createdAt: entry.createdAt,
      status: entry.status,
    }))
    .sort(sortByDateAsc);
}

export async function addComment(slug, payload) {
  const store = await readStore();
  const key = normalizeSlug(slug);
  if (!key) throw new Error("Invalid slug");

  const author = cleanAuthor(payload?.author);
  const message = cleanMessage(payload?.message);

  if (!author) throw new Error("Please share a name or nickname");
  if (!message) throw new Error("Please add a comment message");

  const entry = {
    id: createId(),
    author,
    message,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  if (!Array.isArray(store.posts[key])) {
    store.posts[key] = [];
  }

  store.posts[key].push(entry);
  await writeStore(store);
  return entry;
}

export async function setCommentStatus(slug, commentId, status) {
  const store = await readStore();
  const key = normalizeSlug(slug);
  const entries = Array.isArray(store.posts?.[key]) ? store.posts[key] : [];
  const index = entries.findIndex((entry) => entry.id === commentId);
  if (index === -1) {
    return null;
  }

  const allowed = new Set(["pending", "approved", "rejected"]);
  const nextStatus = allowed.has(status) ? status : "pending";
  entries[index].status = nextStatus;
  entries[index].moderatedAt = new Date().toISOString();
  await writeStore(store);
  return entries[index];
}

export async function deleteComment(slug, commentId) {
  const store = await readStore();
  const key = normalizeSlug(slug);
  if (!Array.isArray(store.posts?.[key])) return false;
  const next = store.posts[key].filter((entry) => entry.id !== commentId);
  if (next.length === store.posts[key].length) return false;
  store.posts[key] = next;
  await writeStore(store);
  return true;
}
