import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(repoRoot, "content");

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

    const postSlug = firstSlugFrom(path.join(contentRoot, "posts"));
    const curseSlug = firstSlugFrom(path.join(contentRoot, "white-magic-curses"));

    const routes = ["/", "/entities/", "/curses/", "/hub/", "/tools/"];
    if (postSlug) routes.push(`/post/${postSlug}/`);
    if (curseSlug) routes.push(`/curses/${curseSlug}/`);

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
          return tabindex === "-1";
        })
        .map((element) => element.outerHTML.slice(0, 120));
    });
    expect.soft(inaccessibleHome, "Home interactive elements should be keyboard focusable").toHaveLength(0);

    const secondaryRoute = routes.find((route) => route !== "/") ?? routes[0];
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
          return tabindex === "-1";
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
});
