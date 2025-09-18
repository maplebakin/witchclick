// src/utils/entities.js — no TypeScript syntax, ESM only
import fs from 'node:fs';
import path from 'node:path';

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'entities');

export function readAllEntities() {
  const result = {};
  if (!fs.existsSync(CONTENT_ROOT)) return result;

  const types = fs.readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const type of types) {
    const dir = path.join(CONTENT_ROOT, type);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const items = [];
    for (const f of files) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        items.push({
          type: j.type || type,
          slug: j.slug || f.replace(/\.json$/, ''),
          name: j.name || '',
          summary: j.summary || '',
          properties: j.properties || {},
          related: Array.isArray(j.related) ? j.related : [],
        });
      } catch {
        // ignore malformed JSON files
      }
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    result[type] = items;
  }
  return result;
}

export function readEntity(type, slug) {
  const file = path.join(CONTENT_ROOT, type, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      type: j.type || type,
      slug: j.slug || slug,
      name: j.name || slug,
      summary: j.summary || '',
      properties: j.properties || {},
      related: Array.isArray(j.related) ? j.related : [],
    };
  } catch {
    return null;
  }
}
