// src/pages/api/staging/list.json.ts
// List all draft posts for staging management

import {
  getCanonicalPostDisplayPath,
  readAllPostRecords,
  resolveCanonicalPostsDirectory,
} from '../../../utils/postFiles';
import { json, jsonError, requireMutatingAccess } from '../_mutating';

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

export async function GET({ request }: { request: Request }) {
  const denied = requireMutatingAccess(request);
  if (denied) return denied;

  try {
    const postsDir = resolveCanonicalPostsDirectory();
    const drafts: DraftPost[] = [];
    const records = readAllPostRecords(postsDir);

    for (const record of records) {
      const { data, slug, fileName } = record;

      // Only include drafts
      if (data.draft === true) {
        drafts.push({
          slug,
          title: data.title || 'Untitled',
          excerpt: data.excerpt || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          wordCount: data.wordCount || 0,
          readingMinutes: data.readingMinutes || 1,
          publishedAt: data.publishedAt || new Date().toISOString(),
          filePath: getCanonicalPostDisplayPath(fileName),
          promptMetadata: data.promptMetadata,
        });
      }
    }

    // Sort by publishedAt descending (newest first)
    drafts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return json({ ok: true, drafts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}

export async function POST({ request }: { request: Request }) {
  return GET({ request });
}
