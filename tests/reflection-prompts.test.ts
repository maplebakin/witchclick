import { describe, expect, it } from "vitest";

import { extractReflectionPrompts } from "../src/utils/reflectionPrompts";

describe("reflection prompt extraction", () => {
  it("prefers explicit structured prompts", () => {
    expect(
      extractReflectionPrompts({ reflectionPrompts: [" What changed? "] }, "## Reflection Prompt\nIgnored?"),
    ).toEqual(["What changed?"]);
  });

  it("extracts singular prompt paragraphs", () => {
    expect(
      extractReflectionPrompts({}, "## Reflection Prompt\n\n**What feels possible now?**\n\n## Closing\nDone."),
    ).toEqual(["What feels possible now?"]);
  });

  it("extracts plural bullet and numbered prompts", () => {
    expect(
      extractReflectionPrompts({}, "## Journaling Prompts\n\n1. What needs room?\n2. What can wait?"),
    ).toEqual(["What needs room?", "What can wait?"]);
  });

  it("returns no prompts for ordinary prose", () => {
    expect(extractReflectionPrompts({}, "## Closing Reflection\nA gentle ending.")).toEqual([]);
  });
});
