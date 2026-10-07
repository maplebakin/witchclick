import fs from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { adminNavSections } from "../src/data/navigation";

const source = fs.readFileSync(new URL("../src/components/AdminNav.astro", import.meta.url), "utf8");
const frontmatter = source.split("\n---\n")[0]!.replace(/^---\n/, "").replace(/^import .*;$/gm, "");
const script = ts.transpileModule(`${frontmatter}\n({ navSections, quickLinks, activeHref, currentPageLabel });`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

interface NavItem {
  href: string;
  label: string;
  description: string;
}

function navigation(currentPath: string) {
  const autumnWindowTokens = fs.readFileSync(new URL("../src/styles/autumn-window.tokens.css", import.meta.url), "utf8");
  return runInNewContext(script, { Astro: { props: { currentPath } }, autumnWindowTokens }) as {
    navSections: Array<{ label: string; items: NavItem[] }>;
    quickLinks: NavItem[];
    activeHref?: string;
    currentPageLabel: string;
  };
}

const expectedSections = [
  ["Dashboard", [["/admin", "Work queues"]]],
  ["Create", [["/admin/generator", "Generate a post"], ["/admin/write", "Write a post"], ["/admin/curses", "Generate a curse"]]],
  ["Review", [["/admin/staging", "Review drafts"], ["/admin/stubs", "Post Stub Forge"], ["/admin/hero", "Complete hero images"]]],
  ["Library", [["/admin/posts", "Posts"], ["/admin/entities", "Entities"], ["/admin/curses/archive", "Curse archive & editor"], ["/admin/downloads", "Downloads"], ["/admin/authors", "Authors"]]],
  ["Site", [["/admin/home", "Homepage"], ["/admin/calendar", "Seasonal calendar"], ["/admin/partners", "Partners & community"], ["/admin/products", "Affiliate products"], ["/admin/theme", "Themes & typography"]]],
  ["System", [["/admin/settings", "Site settings"]]],
] as const;

describe("admin navigation", () => {
  it("keeps Header and mobile admin taxonomy in sync with the in-page navigation", () => {
    expect(adminNavSections).toEqual(navigation("/admin").navSections);
    expect(adminNavSections.flatMap(section => section.items)).toHaveLength(18);
    const header = fs.readFileSync(new URL("../src/components/Header.astro", import.meta.url), "utf8");
    expect(header.match(/visibleAdminSections\.map/g)).toHaveLength(2);
  });

  it("lists all 18 routes exactly once under the requested workflow taxonomy", () => {
    const { navSections } = navigation("/admin");
    expect(navSections.map(section => [section.label, section.items.map(item => [item.href, item.label])])).toEqual(expectedSections);
    const items = navSections.flatMap(section => section.items);
    expect(items).toHaveLength(18);
    expect(new Set(items.map(item => item.href)).size).toBe(18);
    expect(items.every(item => item.description.trim().length > 0)).toBe(true);
    expect(items[0]!.description).toBe("Overview and next actions");
  });

  it("limits quick links to the four requested destinations in order", () => {
    expect(navigation("/admin").quickLinks.map(item => [item.href, item.label])).toEqual([
      ["/admin", "Work queues"],
      ["/admin/generator", "Generate a post"],
      ["/admin/staging", "Review drafts"],
      ["/admin/posts", "Posts"],
    ]);
  });

  it.each([
    ["/admin", "/admin", "Work queues"],
    ["/admin/curses", "/admin/curses", "Generate a curse"],
    ["/admin/curses/archive", "/admin/curses/archive", "Curse archive & editor"],
    ["/admin/curses/archive/item", "/admin/curses/archive", "Curse archive & editor"],
    ["/admin/posts", "/admin/posts", "Posts"],
  ])("selects only the most specific item for %s", (currentPath, href, label) => {
    const nav = navigation(currentPath);
    const activeItems = nav.navSections.flatMap(section => section.items).filter(item => item.href === nav.activeHref);
    expect(activeItems.map(item => item.href)).toEqual([href]);
    expect(nav.currentPageLabel).toBe(label);
    expect(source).toContain("const active = item.href === activeHref;");
    expect(source).toContain('aria-current={active ? "page" : undefined}');
  });

  it.each(["", "/admin/", "/admin/unknown", "/admin/curses-extra", "/admin/posts-extra"])(
    "does not activate Dashboard or a partial path match for %s", currentPath => {
      expect(navigation(currentPath).activeHref).toBeUndefined();
      expect(navigation(currentPath).currentPageLabel).toBe("Admin Panel");
    },
  );
});
