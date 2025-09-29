import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

    await ingestFromSpec(
      {
        title: "Loggable Post",
        body: "# Hello\n\nWorld.",
      },
      { logger: (event) => events.push(event) },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "ingest.post",
      slug: "loggable-post",
      validationStatus: "passed",
      dryRun: false,
    });
    expect(typeof events[0].timestamp).toBe("string");
    expect(typeof events[0].bytesWritten).toBe("number");
  });

  it("records failed validation attempts and propagates the error", async () => {
    const events: Array<Record<string, unknown>> = [];
    const { ingestFromSpec, IngestValidationError } = await import("../scripts/ingest.mjs");

    await expect(
      ingestFromSpec(
        {
          title: "Missing body",
        },
        { logger: (event) => events.push(event) },
      ),
    ).rejects.toBeInstanceOf(IngestValidationError);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "ingest.post",
      validationStatus: "failed",
    });
    expect(Array.isArray(events[0].errors)).toBe(true);
  });
});
