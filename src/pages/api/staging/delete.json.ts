// src/pages/api/staging/delete.json.ts
// Delete a draft post

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

    // Verify it's a draft before deleting
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(content);

    if (data.draft !== true) {
      return json(
        { ok: false, error: 'Cannot delete published post. Only drafts can be deleted from staging.' },
        400
      );
    }

    // Delete the file
    fs.unlinkSync(filePath);

    return json({
      ok: true,
      slug,
      title: data.title,
      deleted: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: message }, 500);
  }
}
