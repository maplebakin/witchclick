// tools/src/seo.ts
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { clamp, listPostFiles } from './utils';

export function seoCmd(args: string[]) {
  const slug = getArg(args, '--slug');
  const apply = hasFlag(args, '--apply');
  if (!slug) throw new Error('--slug required');

  const CWD = process.cwd();
  const POSTS_DIR = path.join(CWD, 'content', 'posts');
  const PUBLIC_HERO_DIR = path.join(CWD, 'public', 'hero-images');
  const SETTINGS_PATH = path.join(CWD, 'content', 'settings.json');

  const mdPath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(mdPath)) throw new Error('post not found');

  const raw = fs.readFileSync(mdPath, 'utf8');
  const file = matter(raw);
  const data = file.data as any;
  const content = String(file.content || '');

  const settings = safeReadJSON(SETTINGS_PATH) || {};

  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: Record<string, string> = {};

  /* ---------- Title/meta ---------- */
  const titleInput = String(data.metaTitle || data.title || '');
  const titleLen = titleInput.length;
  if (titleLen < 50 || titleLen > 60) {
    warnings.push(`title length ≈${titleLen} (target 50–60)`);
    const fixed = clampToWords(titleInput, 50, 60);
    if (fixed && fixed !== titleInput) fixes.metaTitle = fixed;
  }

  const mdInput = String(data.metaDescription || '');
  const mdLen = mdInput.length;
  if (mdLen < 150 || mdLen > 160) {
    warnings.push(`metaDescription length ≈${mdLen} (target 150–160)`);
    const fixed = clampToWords(mdInput, 150, 160);
    if (fixed && fixed !== mdInput) fixes.metaDescription = fixed;
  }

  if (!data.excerpt || String(data.excerpt).trim().length < 40) {
    warnings.push('excerpt is short or missing (aim ~100–180 chars).');
  }

  /* ---------- Tags ---------- */
  if (!Array.isArray(data.tags) || data.tags.length < 4 || data.tags.length > 7) {
    errors.push('tags must be 4–7');
  }

  /* ---------- Affiliate density ---------- */
  const words = (content.match(/\b[\w’']+\b/g) || []).length;
  const anchors = Array.isArray(data.affiliateAnchors) ? data.affiliateAnchors.length : 0;
  const maxAnchors = Math.floor(words / 250) + 1;
  if (anchors > maxAnchors) {
    errors.push(`Too many affiliate anchors: ${anchors} > ${maxAnchors}`);
  }

  /* ---------- Readability (Flesch-Kincaid rough) ---------- */
  const sentences = Math.max(1, (content.match(/[.!?]+/g) || []).length);
  const syllables = words * 1.3; // rough estimate
  const fk = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  const grade = clamp(fk, 1, 12);
  if (grade > 8.5) warnings.push(`Readability is a bit high (≈${grade.toFixed(1)}). Try shorter sentences.`);

  /* ---------- Internal links sanity ---------- */
  const internalLinks = Array.isArray(data.internalLinks) ? data.internalLinks : [];
  if (internalLinks.length < 3) {
    warnings.push(`internalLinks are sparse (${internalLinks.length}; aim 3–7).`);
  }
  // verify anchors appear in prose (case-insensitive)
  const prose = content.toLowerCase();
  const missingAnchors = internalLinks
    .map((l: any) => String(l.anchor || '').toLowerCase())
    .filter((a: string) => a && !prose.includes(a));
  if (missingAnchors.length) {
    warnings.push(
      `Some internal link anchors not found verbatim in prose: ${uniq(missingAnchors)
        .slice(0, 5)
        .join(', ')}${missingAnchors.length > 5 ? '…' : ''}`,
    );
  }

  /* ---------- Hero image presence ---------- */
  const heroExists = findHero(PUBLIC_HERO_DIR, slug);
  if (!heroExists) {
    warnings.push('No hero image found in /public/hero-images (optional, but improves CTR/social).');
  }

  /* ---------- Ko-fi sanity ---------- */
  if (data.includeKofi && !settings.kofiUsername) {
    warnings.push('includeKofi is true but settings.kofiUsername is missing.');
  }

  /* ---------- Headings presence ---------- */
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  if (h2Count < 2) warnings.push('Low H2 count (aim ≥2 for scannability).');

  /* ---------- Output ---------- */
  const ok = errors.length === 0;
  const out = { ok, errors, warnings, fixes };

  // Apply fixes if requested
  if (apply && Object.keys(fixes).length) {
    const nextData = { ...data, ...fixes };
    const nextRaw = matter.stringify(file.content, nextData);
    fs.writeFileSync(mdPath, nextRaw, 'utf8');
    process.stdout.write(JSON.stringify({ ...out, applied: Object.keys(fixes) }, null, 2) + '\n');
  } else {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  }

  // Only fail build on hard errors
  if (!ok) process.exit(1);
}

/* ---------------- helpers ---------------- */

function getArg(a: string[], k: string) {
  const i = a.indexOf(k);
  return i >= 0 ? a[i + 1] : undefined;
}

function hasFlag(a: string[], k: string) {
  return a.includes(k);
}

function safeReadJSON(p: string) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function clampToWords(s: string, min: number, max: number) {
  const str = String(s || '').trim();
  if (!str) return '';
  if (str.length <= max && str.length >= min) return str;
  if (str.length <= min) return str; // don’t pad; just warn
  // trim to last word boundary before max
  const cut = str.slice(0, max + 1);
  const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('—'), cut.lastIndexOf('-'));
  const trimmed = (idx > 0 ? cut.slice(0, idx) : cut).trim();
  return trimmed.replace(/[ \-–—]+$/,'');
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function findHero(dir: string, slug: string) {
  try {
    const exts = ['png', 'jpg', 'jpeg', 'webp', 'avif'];
    for (const ext of exts) {
      const p = path.join(dir, `${slug}.${ext}`);
      if (fs.existsSync(p)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
