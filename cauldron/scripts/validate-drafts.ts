#!/usr/bin/env tsx
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostSpecV2Schema } from '../witchclick-shared/lib/postSpecSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const draftsDir = path.join(projectRoot, 'drafts');

type DraftSummary = {
  slug: string;
  title: string;
  status: string;
};

async function loadDraft(slug: string): Promise<any> {
  const filePath = path.join(draftsDir, `${slug}.json`);
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed;
}

async function collectDrafts(): Promise<{ summaries: DraftSummary[]; payloads: Map<string, any> }> {
  const files = await readdir(draftsDir);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));
  const payloads = new Map<string, any>();
  const summaries: DraftSummary[] = [];

  for (const file of jsonFiles.sort()) {
    const slug = file.replace(/\.json$/, '');
    try {
      const payload = await loadDraft(slug);
      payloads.set(slug, payload);
      summaries.push({
        slug,
        title: typeof payload?.title === 'string' && payload.title.trim().length ? payload.title : slug,
        status: typeof payload?.status === 'string' ? payload.status : 'draft',
      });
    } catch (_err) {
      summaries.push({ slug, title: `${slug} (invalid JSON)`, status: 'error' });
    }
  }

  return { summaries, payloads };
}

async function validateDrafts() {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list') || args.includes('-l');
  const targetSlug = args.find((arg) => !arg.startsWith('-')) ?? null;

  const { summaries, payloads } = await collectDrafts();

  if (listOnly) {
    console.log('Drafts on file:');
    for (const draft of summaries) {
      console.log(` • ${draft.slug.padEnd(24)} ${draft.title} [${draft.status}]`);
    }
    return;
  }

  const slugsToValidate = targetSlug ? [targetSlug] : summaries.map((draft) => draft.slug);
  let failures = 0;

  for (const slug of slugsToValidate) {
    const payload = payloads.get(slug);
    if (!payload) {
      console.error(`✖ ${slug}: missing or unreadable draft.`);
      failures += 1;
      continue;
    }

    const result = PostSpecV2Schema.safeParse(payload);
    if (!result.success) {
      console.error(`✖ ${slug}: ${result.error.issues.length} issue(s)`);
      for (const issue of result.error.issues) {
        console.error(`   • ${issue.path.join('.') || '(root)'} — ${issue.message}`);
      }
      failures += 1;
    } else {
      const summary = summaries.find((item) => item.slug === slug);
      console.log(`✔ ${slug}: ${summary?.title ?? 'Untitled draft'}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

validateDrafts().catch((err) => {
  console.error('Unexpected error while validating drafts:', err);
  process.exit(1);
});
