import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdfBuffer = Buffer.from("%PDF-1.4\n", "utf8");
const pageSetContent = vi.fn(async () => {});
const pagePdf = vi.fn(async () => pdfBuffer);
const pageClose = vi.fn(async () => {});
const browserClose = vi.fn(async () => {});
const browserNewPage = vi.fn(async () => ({
  setContent: pageSetContent,
  pdf: pagePdf,
  close: pageClose,
}));
const browserLaunch = vi.fn(async () => ({
  newPage: browserNewPage,
  close: browserClose,
}));

vi.mock("playwright", () => ({
  chromium: {
    launch: browserLaunch,
  },
}));

describe("exportCmd pdf", () => {
  let originalCwd: string;
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wc-export-"));
    process.chdir(tempDir);

    const postsDir = path.join(tempDir, "content", "posts");
    fs.mkdirSync(postsDir, { recursive: true });
    fs.writeFileSync(
      path.join(postsDir, "pdf-test.md"),
      [
        "---",
        "title: PDF Test",
        "metaDescription: Export test",
        "---",
        "",
        "This is a PDF export regression test.",
      ].join("\n"),
      "utf8",
    );
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes a PDF export when format=pdf", async () => {
    const { exportCmd } = await import("../src/export");
    await exportCmd(["--slug", "pdf-test", "--format", "pdf"]);

    const pdfPath = path.join(tempDir, "dist", "exports", "pdf-test.pdf");
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.readFileSync(pdfPath)).toEqual(pdfBuffer);

    expect(browserLaunch).toHaveBeenCalled();
    expect(browserNewPage).toHaveBeenCalled();
    expect(pageSetContent).toHaveBeenCalledWith(
      expect.stringContaining("<!doctype html>"),
      expect.objectContaining({ waitUntil: "networkidle" }),
    );
    expect(pagePdf).toHaveBeenCalledWith(expect.objectContaining({ printBackground: true }));
    expect(pageClose).toHaveBeenCalled();
    expect(browserClose).toHaveBeenCalled();
  });
});
