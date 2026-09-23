import { describe, expect, it } from "vitest";

import {
  createRitualLabPlan,
  type RitualLabEntry,
} from "../src/utils/ritualLab";

function ritual(
  title: string,
  intents: string[],
  options: {
    tools?: string[];
    durationMinutes?: number;
    tags?: string[];
  } = {},
): RitualLabEntry {
  return {
    slug: title.toLowerCase().replaceAll(" ", "-"),
    title,
    intents,
    tools: options.tools ?? [],
    durationMinutes: options.durationMinutes,
    tags: options.tags ?? [],
    steps: [],
  };
}

describe("Ritual Lab recommendations", () => {
  it("requires a selected intent and does not let time or tools rescue a mismatch", () => {
    const entries = [
      ritual("Rest Practice", ["rest"], { durationMinutes: 50 }),
      ritual("Focus Practice", ["focus"], { tools: ["game"], durationMinutes: 5 }),
    ];

    const matchingIntent = createRitualLabPlan(entries, {
      intent: "rest",
      maxMinutes: 10,
      tools: ["game"],
    });
    expect(matchingIntent.primary?.title).toBe("Rest Practice");
    expect(matchingIntent.alternates).toHaveLength(0);

    const unmatchedIntent = createRitualLabPlan(entries, {
      intent: "unmatched",
      maxMinutes: 10,
      tools: ["game"],
    });
    expect(unmatchedIntent.primary).toBeUndefined();
    expect(unmatchedIntent.alternates).toHaveLength(0);
  });

  it("preserves tool, time, and tag ranking among intent-compatible entries", () => {
    const entries = [
      ritual("A Longer Rest", ["rest"], { durationMinutes: 30 }),
      ritual("Z Game Rest", ["rest"], { tools: ["game"] }),
      ritual("M Sound Rest", ["rest"], { tags: ["sound"] }),
      ritual("N Short Rest", ["rest"], { durationMinutes: 10 }),
    ];

    expect(
      createRitualLabPlan(entries, { intent: "rest", tools: ["game"] }).primary?.title,
    ).toBe("Z Game Rest");
    expect(
      createRitualLabPlan(entries, { intent: "rest", maxMinutes: 10 }).primary?.title,
    ).toBe("N Short Rest");
    expect(
      createRitualLabPlan(entries, { intent: "rest", tools: ["sound"] }).primary?.title,
    ).toBe("M Sound Rest");
  });

  it("keeps time/tool recommendations functional when no intent is selected", () => {
    const entries = [
      ritual("Focus Game Practice", ["focus"], {
        tools: ["game"],
        durationMinutes: 10,
      }),
      ritual("Rest Practice", ["rest"], { durationMinutes: 10 }),
    ];

    const plan = createRitualLabPlan(entries, {
      tools: ["game"],
      maxMinutes: 10,
    });

    expect(plan.primary?.title).toBe("Focus Game Practice");
    expect(plan.alternates.map(({ title }) => title)).toContain("Rest Practice");
  });
});
