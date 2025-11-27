import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it, vi, type MockInstance } from "vitest";

import type {
  AdminThemeListing,
  AdminThemeRecord,
  AdminThemeSettings,
} from "../dev-api.js";

let tempDir: string;
let cwdSpy: MockInstance<() => string> | undefined;
let listThemes: () => Promise<AdminThemeListing>;
let saveThemeRecord: (payload: Record<string, unknown>) => Promise<AdminThemeRecord>;
let setActiveThemeRecord: (
  payload: Record<string, unknown>,
) => Promise<{ active: AdminThemeListing["active"]; theme: AdminThemeRecord }>;
let _deleteThemeRecord: (
  payload: Record<string, unknown>,
) => Promise<{ slug: string; mode: AdminThemeRecord["mode"]; active: AdminThemeListing["active"] }>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-admin-theme-"));
  cwdSpy = vi.spyOn(process, "cwd");
  cwdSpy.mockReturnValue(tempDir);
}

async function cleanupTempDir() {
  if (cwdSpy) cwdSpy.mockRestore();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function expectThemeHasAllSettings(settings: AdminThemeSettings) {
  expect(settings.primary).toBeTypeOf("string");
  expect(settings.accent).toBeTypeOf("string");
  expect(settings.background).toBeTypeOf("string");
  expect(settings.fontSerif).toBeTypeOf("string");
  expect(settings.fontScript).toBeTypeOf("string");
}

describe("admin theme dashboard", () => {
  beforeEach(async () => {
    process.env.VITEST = "true";
    await prepareTempDir();
    vi.resetModules();
    ({
      listThemes,
      saveThemeRecord,
      setActiveThemeRecord,
      deleteThemeRecord: _deleteThemeRecord,
    } = await import("../dev-api.js"));
  });

  afterEach(async () => {
    await cleanupTempDir();
    vi.resetModules();
  });

  it("saves custom themes and activates them for midnight and dawn", async () => {
    const midnightTheme = await saveThemeRecord({
      mode: "midnight",
      label: "Test Midnight",
      settings: {
        primary: "#332244",
        accent: "#d4a373",
        background: "#120725",
        fontSerif: "Literata",
        fontScript: "Parisienne",
        textPrimary: "#ede7ff",
        linkColor: "#c084fc",
        cardFocusOutline: "0 0 0 3px rgba(208, 163, 115, 0.42)",
        fontHeading: "Cinzel",
        backgroundImage: "url(/images/theme/test-midnight.png)",
      },
    });

    expect(midnightTheme.slug).toBe("test-midnight");
    expect(midnightTheme.mode).toBe("midnight");
    expectThemeHasAllSettings(midnightTheme.settings);
    expect(midnightTheme.settings.textPrimary).toBe("#ede7ff");
    expect(midnightTheme.settings.linkColor).toBe("#c084fc");
    expect(midnightTheme.settings.cardFocusOutline).toBe("0 0 0 3px rgba(208, 163, 115, 0.42)");
    expect(midnightTheme.settings.fontHeading).toBe("Cinzel");
    expect(midnightTheme.settings.backgroundImage).toBe("url(/images/theme/test-midnight.png)");

    const dawnTheme = await saveThemeRecord({
      mode: "dawn",
      label: "Test Dawn",
      settings: {
        primary: "#8c6bb1",
        accent: "#e8b923",
        background: "#f7f1e5",
        fontSerif: "Literata",
        fontScript: "Parisienne",
        textPrimary: "#2f1f3f",
        linkColor: "#d97706",
      },
    });

    expect(dawnTheme.slug).toBe("test-dawn");
    expect(dawnTheme.mode).toBe("dawn");
    expectThemeHasAllSettings(dawnTheme.settings);
    expect(dawnTheme.settings.textPrimary).toBe("#2f1f3f");
    expect(dawnTheme.settings.linkColor).toBe("#d97706");

    const themeDir = path.join(tempDir, "content", "themes");
    const midnightFile = JSON.parse(
      await fs.readFile(path.join(themeDir, `${midnightTheme.slug}.json`), "utf8"),
    );
    const dawnFile = JSON.parse(
      await fs.readFile(path.join(themeDir, `${dawnTheme.slug}.json`), "utf8"),
    );

    expect(midnightFile.settings).toEqual(midnightTheme.settings);
    expect(dawnFile.settings).toEqual(dawnTheme.settings);

    const listing = await listThemes();
    expect(listing.items.midnight.map((t) => t.slug)).toContain(midnightTheme.slug);
    expect(listing.items.dawn.map((t) => t.slug)).toContain(dawnTheme.slug);
    expect(listing.active.midnight).toBeNull();
    expect(listing.active.dawn).toBeNull();

    const activatedMidnight = await setActiveThemeRecord({
      mode: "midnight",
      slug: midnightTheme.slug,
    });
    expect(activatedMidnight.active.midnight).toBe(midnightTheme.slug);
    expect(activatedMidnight.active.dawn).toBeNull();

    const activatedDawn = await setActiveThemeRecord({
      mode: "dawn",
      slug: dawnTheme.slug,
    });
    expect(activatedDawn.active.midnight).toBe(midnightTheme.slug);
    expect(activatedDawn.active.dawn).toBe(dawnTheme.slug);

    const activeFile = JSON.parse(
      await fs.readFile(path.join(themeDir, "active.json"), "utf8"),
    );
    expect(activeFile).toEqual({ midnight: midnightTheme.slug, dawn: dawnTheme.slug });

  });

  it("fills in default fonts when they are left blank in the payload", async () => {
    const theme = await saveThemeRecord({
      mode: "dawn",
      label: "Minimal Dawn",
      settings: {
        primary: "#7b6f95",
        accent: "#e9c46a",
        background: "#fef9ef",
      },
    });

    expect(theme.settings.fontSerif).toBe("Literata");
    expect(theme.settings.fontScript).toBe("Parisienne");
  });

  it("resets the theme cache after save, update, and delete operations", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    process.env.NODE_ENV = "production";
    delete process.env.VITEST;

    vi.resetModules();

    const themeCacheModule = await import("../shared/theme-cache.js");
    const resetSpy = vi.spyOn(themeCacheModule, "resetThemeCache");

    const {
      saveThemeRecord: save,
      setActiveThemeRecord: activate,
      deleteThemeRecord: remove,
    } = await import("../dev-api.js");
    const { getActiveThemes } = await import("../src/utils/theme.ts");

    try {
      const basePayload = {
        mode: "midnight",
        label: "Cache Test",
        settings: {
          primary: "#112233",
          accent: "#d4a373",
          background: "#120725",
          fontSerif: "Literata",
          fontScript: "Parisienne",
        },
      } as const;

      await save(basePayload);
      await activate({ mode: "midnight", slug: "cache-test" });

      const initial = getActiveThemes();
      expect(initial.midnight.slug).toBe("cache-test");
      expect(initial.midnight.primary).toBe("#112233");

      await save({
        ...basePayload,
        settings: {
          ...basePayload.settings,
          primary: "#334455",
          background: "#1a1324",
        },
      });

      const refreshed = getActiveThemes();
      expect(refreshed.midnight.primary).toBe("#334455");

      await remove({ slug: "cache-test" });

      const afterDelete = getActiveThemes();
      expect(afterDelete.midnight.slug).toBe("legacy-midnight");

      expect(resetSpy).toHaveBeenCalledTimes(4);
    } finally {
      resetSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
      if (typeof originalVitest === "undefined") {
        delete process.env.VITEST;
      } else {
        process.env.VITEST = originalVitest;
      }
    }
  });
});
