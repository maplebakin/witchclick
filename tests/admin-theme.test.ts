import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import type {
  AdminThemeListing,
  AdminThemeRecord,
  AdminThemeSettings,
} from "../dev-api.js";

let tempDir: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
let listThemes: () => Promise<AdminThemeListing>;
let saveThemeRecord: (payload: Record<string, unknown>) => Promise<AdminThemeRecord>;
let setActiveThemeRecord: (
  payload: Record<string, unknown>,
) => Promise<{ active: AdminThemeListing["active"]; theme: AdminThemeRecord }>;

async function prepareTempDir() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wc-admin-theme-"));
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
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
      },
    });

    expect(midnightTheme.slug).toBe("test-midnight");
    expect(midnightTheme.mode).toBe("midnight");
    expectThemeHasAllSettings(midnightTheme.settings);

    const dawnTheme = await saveThemeRecord({
      mode: "dawn",
      label: "Test Dawn",
      settings: {
        primary: "#8c6bb1",
        accent: "#e8b923",
        background: "#f7f1e5",
        fontSerif: "Literata",
        fontScript: "Parisienne",
      },
    });

    expect(dawnTheme.slug).toBe("test-dawn");
    expect(dawnTheme.mode).toBe("dawn");
    expectThemeHasAllSettings(dawnTheme.settings);

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

    const legacyFile = JSON.parse(
      await fs.readFile(path.join(tempDir, "content", "theme.json"), "utf8"),
    );
    expect(legacyFile).toEqual(midnightTheme.settings);
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

  it("persists theme overrides when saving presets", async () => {
    const overrides = [
      {
        scope: "header",
        variables: {
          background: "#0b0315",
          textPrimary: "#ffeeee",
        },
      },
      {
        scope: "cta",
        variables: {
          accent: "#ffaa33",
        },
      },
    ];

    const theme = await saveThemeRecord({
      mode: "midnight",
      label: "Midnight Overrides",
      settings: {
        primary: "#332244",
        accent: "#d4a373",
        background: "#120725",
        fontSerif: "Literata",
        fontScript: "Parisienne",
      },
      overrides,
    });

    expect(theme.overrides).toEqual(overrides);

    const themeDir = path.join(tempDir, "content", "themes");
    const savedFile = JSON.parse(
      await fs.readFile(path.join(themeDir, `${theme.slug}.json`), "utf8"),
    );
    expect(savedFile.overrides).toEqual(overrides);

    const listing = await listThemes();
    const listed = listing.items.midnight.find((item) => item.slug === theme.slug);
    expect(listed?.overrides).toEqual(overrides);
  });
});
