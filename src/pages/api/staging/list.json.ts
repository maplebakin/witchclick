// src/pages/api/staging/list.json.ts
// List all draft posts for staging management

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

interface DraftPost {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  readingMinutes: number;
  publishedAt: string;
  filePath: string;
  promptMetadata?: {
    topic?: string;
    requestedWords?: number;
    deliveredWords?: number;
    generatedAt?: string;
  };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    const CWD = process.cwd();
    const postsDir = path.join(CWD, 'content', 'posts');

    if (!fs.existsSync(postsDir)) {
      return json({ ok: true, drafts: [] });
    }

    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
    const drafts: DraftPost[] = [];

    for (const file of files) {
      const filePath = path.join(postsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);

      // Only include drafts
      if (data.draft === true) {
        drafts.push({
          slug: data.slug || file.replace(/\.md$/, ''),
          title: data.title || 'Untitled',
          excerpt: data.excerpt || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          wordCount: data.wordCount || 0,
          readingMinutes: data.readingMinutes || 1,
          publishedAt: data.publishedAt || new Date().toISOString(),
          filePath: `src/content/posts/${file}`,
          promptMetadata: data.promptMetadata,
        });
      }
    }

    // Sort by publishedAt descending (newest first)
    drafts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return json({ ok: true, drafts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: message }, 500);
  }
}

export async function POST() {
  return GET();
}
