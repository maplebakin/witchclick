import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPostSpec } from './postSpecTestUtils';

const TMP_PREFIX = path.join(os.tmpdir(), 'wc-pipeline-');

describe('content pipeline integration', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await mkdtemp(TMP_PREFIX);
    process.chdir(tempDir);
    await mkdir(path.join(tempDir, 'content'), { recursive: true });
    await mkdir(path.join(tempDir, 'src', 'content', 'posts'), { recursive: true });
    process.exitCode = undefined;
    vi.resetModules();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
    process.exitCode = undefined;
    vi.resetModules();
  });

  it('builds prompts with settings, products, and existing post titles', async () => {
    await writeFile(
      path.join(tempDir, 'content', 'settings.json'),
      JSON.stringify({ brandName: 'Test Coven', siteUrl: 'https://tea.test' }),
      'utf8',
    );

    await writeFile(
      path.join(tempDir, 'content', 'products.json'),
      JSON.stringify({ products: [{ key: 'moon-journal' }, { key: 'tea-kit' }, { key: '   ' }] }),
      'utf8',
    );

    await writeFile(
      path.join(tempDir, 'src', 'content', 'posts', 'moon-reflection.md'),
      'title: "Moon Reflection Evening"\n',
      'utf8',
    );

    const { genprompt } = await import('../tools/src/genprompt');

    const { prompt } = genprompt({ topic: 'gentle focus tea ritual', words: 950, ads: 'on', kofi: 'off' });

    expect(prompt).toContain('brandName: "Test Coven"');
    expect(prompt).toContain('siteUrl: "https://tea.test"');
    expect(prompt).toContain('existingPostTitles: ["Moon Reflection Evening"]');
    expect(prompt).toContain('allowedAffiliateKeys: ["moon-journal","tea-kit"]');
  });

  it('persists specs via CLI ingest when saving to posts directory', async () => {
    const spec = createPostSpec({ title: 'Example Focus Ritual', slug: 'example-focus-ritual' });
    const specPath = path.join(tempDir, 'example-spec.json');
    await writeFile(specPath, JSON.stringify(spec), 'utf8');

    const outputs: string[] = [];
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(
      ((chunk: any) => {
        outputs.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
        return true;
      }) as any,
    );

    const { ingest } = await import('../tools/src/ingest.ts');
    await ingest(['--from-file', specPath]);

    writeSpy.mockRestore();

    const payload = JSON.parse(outputs.join(''));
    expect(payload.ok).toBe(true);
    expect(payload.saved).toBe(true);
    expect(payload.slug).toBe('example-focus-ritual');
    expect(payload.path).toBe('src/content/posts/example-focus-ritual.md');

    const saved = await readFile(path.join(tempDir, payload.path), 'utf8');
    expect(saved).toContain('title: "Example Focus Ritual"');
    expect(saved).toMatch(/promptMetadata:/);

    const files = await readdir(path.join(tempDir, 'src', 'content', 'posts'));
    expect(files).toContain('example-focus-ritual.md');
  });

  it('supports dry-run ingestion without writing files', async () => {
    const spec = createPostSpec({ title: 'Dry Run Ritual', slug: 'dry-run-ritual' });
    const specPath = path.join(tempDir, 'dry-run.json');
    await writeFile(specPath, JSON.stringify(spec), 'utf8');

    const outputs: string[] = [];
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(
      ((chunk: any) => {
        outputs.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
        return true;
      }) as any,
    );

    const { ingest } = await import('../tools/src/ingest.ts');
    await ingest(['--from-file', specPath, '--dry-run']);

    writeSpy.mockRestore();

    const payload = JSON.parse(outputs.join(''));
    expect(payload.ok).toBe(true);
    expect(payload.saved).toBe(false);
    expect(payload.slug).toBe('dry-run-ritual');

    const files = await readdir(path.join(tempDir, 'src', 'content', 'posts'));
    expect(files).not.toContain('dry-run-ritual.md');
  });
});

function linkifyFirst(html: string, text: string, replacementHtml: string) {
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(>[^<]*)\\b(${esc})\\b`, 'i');
  return html.replace(re, (match, ...groups) => {
    const word = String(groups[1] ?? '');
    return match.replace(word, replacementHtml);
  });
}

describe('linkifyFirst', () => {
  it('replaces first natural occurrence', () => {
    const out = linkifyFirst('<p>Hello magic tea focus ritual</p>', 'focus ritual', '<a>focus ritual</a>');
    expect(out).toContain('<a>focus ritual</a>');
  });
});
