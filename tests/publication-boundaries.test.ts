import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readEditorialCalendar, resetEditorialCalendarCache } from "../src/utils/editorialCalendar";
import { readPartnerBlocks, resetPartnerBlocksCache } from "../src/utils/partners";

const originalCwd = process.cwd();
let projectRoot = "";

function writeBlock(filename: string, value: unknown) {
  const blockDir = path.join(projectRoot, "content", "blocks");
  fs.mkdirSync(blockDir, { recursive: true });
  fs.writeFileSync(path.join(blockDir, filename), JSON.stringify(value), "utf8");
}

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wc-publication-"));
  process.chdir(projectRoot);
  resetPartnerBlocksCache();
  resetEditorialCalendarCache();
});

afterEach(() => {
  process.chdir(originalCwd);
  resetPartnerBlocksCache();
  resetEditorialCalendarCache();
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe("public content boundaries", () => {
  it("keeps partner drafts and unverified claims off public surfaces", () => {
    writeBlock("partners.json", {
      sections: [
        {
          slug: "shops",
          title: "Shops",
          partners: [
            {
              slug: "draft-shop",
              name: "Draft Shop",
              description: "Unverified draft",
              url: "https://example.com/draft",
            },
            {
              slug: "verified-shop",
              name: "Verified Shop",
              description: "Reviewed listing",
              url: "https://example.com/verified",
              published: true,
              verified: true,
            },
          ],
        },
      ],
      affiliateHighlights: [
        {
          slug: "unverified-product",
          name: "Unverified Product",
          description: "Draft claim",
          url: "https://example.com/product",
          published: true,
        },
      ],
    });

    const publicBlocks = readPartnerBlocks();
    expect(publicBlocks.sections).toHaveLength(1);
    expect(publicBlocks.sections[0]?.partners.map((partner) => partner.slug)).toEqual([
      "verified-shop",
    ]);
    expect(publicBlocks.affiliateHighlights).toEqual([]);

    const internalBlocks = readPartnerBlocks({ includeUnpublished: true });
    expect(internalBlocks.sections[0]?.partners).toHaveLength(2);
    expect(internalBlocks.affiliateHighlights).toHaveLength(1);
  });

  it("publishes editorial seasons only inside an explicit active window", () => {
    writeBlock("editorial-calendar.json", {
      seasons: [
        {
          slug: "internal-plan",
          season: "Draft",
          theme: "Internal",
          focus: "Planning notes",
          window: "Internal",
          anchorPosts: [],
          rituals: ["Private planning item"],
        },
        {
          slug: "active-season",
          season: "Autumn",
          theme: "Visible",
          focus: "Public programming",
          window: "September to November",
          anchorPosts: [],
          rituals: [],
          published: true,
          startsAt: "2026-09-01T00:00:00.000Z",
          endsAt: "2026-11-30T23:59:59.999Z",
        },
      ],
    });

    expect(
      readEditorialCalendar({ now: "2026-10-15T12:00:00.000Z" }).seasons.map(
        (season) => season.slug,
      ),
    ).toEqual(["active-season"]);
    expect(readEditorialCalendar({ now: "2026-12-01T00:00:00.000Z" }).seasons).toEqual([]);
    expect(readEditorialCalendar({ includeUnpublished: true }).seasons).toHaveLength(2);
  });
});
