// src/pages/api/staging/publish.json.ts
// Publish a draft post (remove draft status)

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toFrontmatterYAML(obj: Record<string, unknown>) {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) {
      lines.push(`${k}: null`);
      continue;
    }
    if (typeof v === 'string') {
      lines.push(`${k}: ${JSON.stringify(v)}`);
      continue;
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
      continue;
    }
    lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join('\n');
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const slug = body.slug;

    if (!slug || typeof slug !== 'string') {
      return json({ ok: false, error: 'Missing or invalid slug' }, 400);
    }

    const CWD = process.cwd();
    const postsDir = path.join(CWD, 'content', 'posts');
    const filePath = path.join(postsDir, `${slug}.md`);

    if (!fs.existsSync(filePath)) {
      return json({ ok: false, error: `Post not found: ${slug}` }, 404);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: markdown } = matter(content);

    if (data.draft !== true) {
      return json({ ok: false, error: 'Post is not a draft' }, 400);
    }

    // Remove draft status and update publishedAt to now
    data.draft = false;
    data.publishedAt = new Date().toISOString();

    // Rebuild the file
    const newContent = `---\n${toFrontmatterYAML(data)}\n---\n${markdown}`;
    fs.writeFileSync(filePath, newContent, 'utf8');

    return json({
      ok: true,
      slug,
      title: data.title,
      publishedAt: data.publishedAt,
      path: `src/content/posts/${slug}.md`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: message }, 500);
  }
}
