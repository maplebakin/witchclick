// tools/src/utils.ts
import fs from 'node:fs';
import path from 'node:path';

export function readJSON<T = any>(p: string, fallback?: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback as T;
  }
}

export function writeFileEnsure(p: string, data: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data, 'utf8');
}

export function ensureDirSync(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function slugify(s: string) {
  return String(s)
    .normalize('NFKD')               // split accents
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function wordCountFromMarkdown(md: string) {
  // strip code blocks and inline code
  const withoutCode = md.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
  // strip common markdown tokens and HTML tags
  const withoutMd = withoutCode.replace(/[#>*_~\-]+/g, ' ').replace(/<[^>]+>/g, ' ');
  // unicode-aware words
  const words = withoutMd.match(/\b[\p{L}\p{N}’']+\b/gu);
  return words ? words.length : 0;
}

export function readingMinutes(words: number, wpm = 200) {
  return Math.max(1, Math.round(words / wpm));
}

export function listPostFiles(dir = path.join(process.cwd(), 'content', 'posts')) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

// Simple fallback parser (you mostly use gray-matter elsewhere)
export function parseFrontmatter(raw: string) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const yaml = m[1], body = m[2];
  const data = Object.fromEntries(
    yaml
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(':');
        if (idx < 0) return [line.trim(), ''];
        const k = line.slice(0, idx).trim();
        let v: any = line.slice(idx + 1).trim();
        // try to parse simple JSON-like arrays/objects
        if ((v.startsWith('[') && v.endsWith(']')) || (v.startsWith('{') && v.endsWith('}'))) {
          try { v = JSON.parse(v); } catch {}
        }
        // strip wrapping quotes
        v = v.replace?.(/^"(.*)"$/, '$1');
        return [k, v];
      }),
  );
  return { data, body };
}

// JSON-in-YAML frontmatter writer (safe quoting for strings)
export function toYAML(obj: any) {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) { lines.push(`${k}: null`); continue; }
    if (typeof v === 'string') { lines.push(`${k}: ${JSON.stringify(v)}`); continue; }
    if (typeof v === 'number' || typeof v === 'boolean') { lines.push(`${k}: ${v}`); continue; }
    // arrays/objects inline as JSON (valid YAML)
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

export function ensureEntityStubs(entities: { type: string; slug: string }[]) {
  const root = path.join(process.cwd(), 'content', 'entities');
  for (const e of entities || []) {
    const dir = path.join(root, e.type);
    ensureDirSync(dir);
    const p = path.join(dir, `${e.slug}.json`);
    if (!fs.existsSync(p)) {
      writeFileEnsure(
        p,
        JSON.stringify(
          {
            type: e.type,
            name: e.slug.replace(/-/g, ' '),
            slug: e.slug,
            summary: `${e.slug.replace(/-/g, ' ')} — stub entity`,
            properties: {},
            related: [],
          },
          null,
          2,
        ),
      );
    }
  }
}

export function ensureUniqueSlug(
  baseSlug: string,
  postsDir = path.join(process.cwd(), 'content', 'posts'),
) {
  const safe = slugify(baseSlug);
  let slug = safe || 'post';
  let n = 2;
  while (fs.existsSync(path.join(postsDir, `${slug}.md`))) {
    slug = `${safe}-${n++}`;
  }
  return slug;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
