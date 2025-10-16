import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createPostSpec } from "./postSpecTestUtils";

const TMP_PREFIX = path.join(os.tmpdir(), "wc-ingest-logs-");

describe("ingest logging", () => {
  let tempDir = "";
  let previousRoot = process.env.WC_PROJECT_ROOT;

  beforeEach(async () => {
    tempDir = await mkdtemp(TMP_PREFIX);
    await mkdir(path.join(tempDir, "src", "content", "posts"), { recursive: true });
    previousRoot = process.env.WC_PROJECT_ROOT;
    process.env.WC_PROJECT_ROOT = tempDir;
    vi.resetModules();
  });

  afterEach(async () => {
    if (previousRoot === undefined) delete process.env.WC_PROJECT_ROOT;
    else process.env.WC_PROJECT_ROOT = previousRoot;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("emits structured log events for successful ingests", async () => {
    const events: Array<Record<string, unknown>> = [];
    const { ingestFromSpec } = await import("../scripts/ingest.mjs");

    const spec = createPostSpec({ title: "Loggable Post", slug: "loggable-post" });
    await ingestFromSpec(spec, { logger: (event: Record<string, unknown>) => events.push(event) });

    expect(events).toHaveLength(1);
    const firstEvent = events[0];
    expect(firstEvent).toBeDefined();
    expect(firstEvent).toMatchObject({
      event: "ingest.post",
      slug: "loggable-post",
      validationStatus: "passed",
      dryRun: false,
    });
    expect(typeof firstEvent?.timestamp).toBe("string");
    expect(typeof firstEvent?.bytesWritten).toBe("number");
  });

  it("records failed validation attempts and propagates the error", async () => {
    const events: Array<Record<string, unknown>> = [];
    const { ingestFromSpec, IngestValidationError } = await import("../scripts/ingest.mjs");

    const invalidSpec = createPostSpec({ sections: [] });
    await expect(
      ingestFromSpec(invalidSpec, { logger: (event: Record<string, unknown>) => events.push(event) }),
    ).rejects.toBeInstanceOf(
      IngestValidationError,
    );

    expect(events).toHaveLength(1);
    const failedEvent = events[0];
    expect(failedEvent).toBeDefined();
    expect(failedEvent).toMatchObject({
      event: "ingest.post",
      validationStatus: "failed",
    });
    expect(Array.isArray(failedEvent?.errors)).toBe(true);
  });
});
