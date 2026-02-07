import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const postsRoot = path.join(repoRoot, "src", "content", "posts");
const entitiesRoot = path.join(repoRoot, "content", "entities");

function canonicalPath(pathname: string): string {
  let value = pathname.trim();
  if (!value.startsWith("/")) value = `/${value}`;
  if (value === "/") return "/";
  return value.replace(/\/+$/, "");
}

function firstSlugFrom(directory: string): string | null {
  try {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => entry.name)
      .sort();

    for (const file of entries) {
      const fullPath = path.join(directory, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const fm = matter(raw);
      const explicitSlug = typeof fm.data?.slug === "string" ? fm.data.slug.trim() : "";
      if (explicitSlug) return explicitSlug;
      const fallback = file.replace(/\.md$/i, "");
      if (fallback) return fallback;
    }
  } catch (error) {
    console.warn(`[smoke] unable to read ${directory}`, error);
  }
  return null;
}

type EntityRef = { type: string; slug: string };

type EntityWithPost = EntityRef & { postSlug: string; postTitle: string };

function normalizeEntity(candidate: unknown): EntityRef | null {
  if (!candidate) return null;

  if (typeof candidate === "string") {
    const [typePart = "", slugPart = ""] = candidate.split("/");
    const type = typePart.trim().toLowerCase();
    const slug = slugPart.trim().toLowerCase();
    if (type && slug) return { type, slug };
    return null;
  }

  if (typeof candidate === "object") {
    const type = "type" in candidate ? String(candidate.type ?? "").trim().toLowerCase() : "";
    const slug = "slug" in candidate ? String(candidate.slug ?? "").trim().toLowerCase() : "";
    if (type && slug) return { type, slug };
  }

  return null;
}

function collectEntityReferences(): EntityWithPost[] {
  const postsDir = postsRoot;
  const references: EntityWithPost[] = [];

  try {
    const files = fs
      .readdirSync(postsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(postsDir, file.name), "utf8");
      const fm = matter(raw);
      const postSlug = typeof fm.data?.slug === "string" && fm.data.slug.trim()
        ? fm.data.slug.trim()
        : file.name.replace(/\.md$/i, "");
      const postTitle = typeof fm.data?.title === "string" && fm.data.title.trim()
        ? fm.data.title.trim()
        : postSlug;
      if (fm.data?.draft === true || fm.data?.published === false) {
        continue;
      }

      const entities = Array.isArray(fm.data?.entities) ? fm.data.entities : [];

      for (const entity of entities) {
        const normalized = normalizeEntity(entity);
        if (normalized) {
          references.push({ ...normalized, postSlug, postTitle });
        }
      }
    }
  } catch (error) {
    console.warn(`[smoke] unable to collect entity references`, error);
  }

  return references;
}

function collectAllEntities(): EntityRef[] {
  const root = entitiesRoot;
  const results: EntityRef[] = [];

  try {
    const types = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const type of types) {
      const dir = path.join(root, type);
      const files = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"));

      for (const file of files) {
        results.push({ type, slug: file.name.replace(/\.json$/i, "") });
      }
    }
  } catch (error) {
    console.warn(`[smoke] unable to collect entity catalog`, error);
  }

  return results;
}

function findEntityWithRelatedPost(): EntityWithPost | null {
  const references = collectEntityReferences();
  const first = references[0];
  return first ?? null;
}

function findEntityWithoutRelatedPost(): EntityRef | null {
  const references = collectEntityReferences();
  const referencedKeys = new Set(references.map((ref) => `${ref.type}/${ref.slug}`));
  const allEntities = collectAllEntities();

  for (const entity of allEntities) {
    const key = `${entity.type}/${entity.slug}`;
    if (!referencedKeys.has(key)) {
      return entity;
    }
  }

  return null;
}

test.describe("site smoke", () => {
  test("core routes render without errors", async ({ page }, testInfo) => {
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    page.on("console", (message) => {
      const text = message.text();
      const entry = `[${message.type()}] ${text}`;
      consoleLogs.push(entry);
      if (message.type() === "error") {
        consoleErrors.push(entry);
      }
    });

    page.on("pageerror", (error) => {
      const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      consoleErrors.push(`[pageerror] ${text}`);
    });

    page.on("requestfailed", (request) => {
      const failure = request.failure();
      const errorText = failure?.errorText ?? "unknown";
      if (errorText.includes("ERR_ABORTED")) return;
      networkFailures.push(`${request.method()} ${request.url()} :: ${errorText}`);
    });

    const postSlug = firstSlugFrom(postsRoot);
    const curseSlug =
      firstSlugFrom(path.join(repoRoot, "archive", "curses")) ||
      firstSlugFrom(path.join(repoRoot, "content", "white-magic-curses"));

    const routes = ["/", "/entities/", "/curses/", "/hub/", "/tools/"].map(canonicalPath);
    if (postSlug) routes.push(canonicalPath(`/post/${postSlug}/`));
    if (curseSlug) routes.push(canonicalPath(`/curses/${curseSlug}/`));

    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect.soft(response?.status(), `status for ${route}`).toBe(200);
      const mainText = await page.textContent("main");
      expect.soft(mainText?.trim().length ?? 0, `main content for ${route}`).toBeGreaterThan(0);
    }

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const inaccessibleHome = await page.evaluate(() => {
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button, [role="button"], input, select, textarea, [tabindex]'
        ),
      );
      return focusables
        .filter((element) => {
          if (element.hasAttribute("disabled")) return false;
          if (element.getAttribute("aria-hidden") === "true") return true;
          const style = window.getComputedStyle(element);
          if (style.visibility === "hidden" || style.display === "none") return false;
          const rect = element.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (!visible) return false;
          const tabindex = element.getAttribute("tabindex");
          if (tabindex !== "-1") return false;
          return element.matches('a[href], button, [role="button"], input, select, textarea');
        })
        .map((element) => element.outerHTML.slice(0, 120));
    });
    expect.soft(inaccessibleHome, "Home interactive elements should be keyboard focusable").toHaveLength(0);

    const fallbackRoute = routes[0] ?? "/";
    const secondaryRoute = routes.find((route) => route !== "/") ?? fallbackRoute;
    await page.goto(secondaryRoute, { waitUntil: "domcontentloaded" });
    const inaccessibleSecondary = await page.evaluate(() => {
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button, [role="button"], input, select, textarea, [tabindex]'
        ),
      );
      return focusables
        .filter((element) => {
          if (element.hasAttribute("disabled")) return false;
          if (element.getAttribute("aria-hidden") === "true") return true;
          const style = window.getComputedStyle(element);
          if (style.visibility === "hidden" || style.display === "none") return false;
          const rect = element.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (!visible) return false;
          const tabindex = element.getAttribute("tabindex");
          if (tabindex !== "-1") return false;
          return element.matches('a[href], button, [role="button"], input, select, textarea');
        })
        .map((element) => element.outerHTML.slice(0, 120));
    });
    expect.soft(
      inaccessibleSecondary,
      `Interactive elements on ${secondaryRoute} should be keyboard focusable`,
    ).toHaveLength(0);

    await testInfo.attach("console-log", {
      body: consoleLogs.join("\n") || "(no console messages)",
      contentType: "text/plain",
    });

    if (consoleErrors.length) {
      await testInfo.attach("console-errors", {
        body: consoleErrors.join("\n"),
        contentType: "text/plain",
      });
    }

    if (networkFailures.length) {
      await testInfo.attach("network-failures", {
        body: networkFailures.join("\n"),
        contentType: "text/plain",
      });
    }

    expect(consoleErrors, "Console should be clean").toEqual([]);
    expect(networkFailures, "Network requests should succeed").toEqual([]);
  });

  test("entity pages surface related post cards", async ({ page }) => {
    const entity = findEntityWithRelatedPost();
    test.skip(!entity, "No entities with related posts found in content");
    if (!entity) return;

    const entityPath = canonicalPath(`/entities/${entity.type}/${entity.slug}/`);
    const response = await page.goto(entityPath, {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBe(200);

    const cards = page.locator(".entity-related-list .ritual-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const firstCardHeading = cards.first().locator(".card-heading");
    await expect(firstCardHeading).toContainText(entity.postTitle, { timeout: 5_000 });
    await expect(cards.first().locator(".card-metadata")).toContainText(/\d{4}/);
  });

  test("entity pages invite contributions when empty", async ({ page }) => {
    const entity = findEntityWithoutRelatedPost();
    test.skip(!entity, "All entities currently referenced by posts");
    if (!entity) return;

    const entityPath = canonicalPath(`/entities/${entity.type}/${entity.slug}/`);
    const response = await page.goto(entityPath, {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBe(200);

    const placeholder = page.locator(".entity-related-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText("Lore Hub");
    await expect(placeholder.locator('a[href^="/hub"]')).toBeVisible();
  });
});
