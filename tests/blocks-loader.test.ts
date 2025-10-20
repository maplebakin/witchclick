import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEvergreenBlocks, resetBlocksCache } from "../src/utils/blocks";

describe("readEvergreenBlocks", () => {
  let tempDir: string;

  beforeEach(() => {
    resetBlocksCache();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wc-blocks-"));
  });

  afterEach(() => {
    resetBlocksCache();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns empty defaults when file is missing", () => {
    const result = readEvergreenBlocks(path.join(tempDir, "missing.json"));
    expect(result).toEqual({ testimonials: [], testimonialSection: undefined });
  });

  it("parses CTA and testimonials from disk", () => {
    const filePath = path.join(tempDir, "home.json");
    const payload = {
      cta: {
        eyebrow: "Test",
        title: "Join",
        description: "Stay cozy",
        form: { action: "https://example.com", method: "post" },
      },
      testimonialSection: {
        eyebrow: "Notes",
        title: "Warm fuzzies",
      },
      testimonials: [
        { quote: "Cozy", author: "A" },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(payload), "utf8");

    const result = readEvergreenBlocks(filePath);
    expect(result.cta?.title).toBe("Join");
    expect(result.testimonials).toHaveLength(1);
    expect(result.testimonialSection?.title).toBe("Warm fuzzies");
  });
});
