#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostSpecV2Schema } from '../witchclick-shared/lib/postSpecSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const draftsDir = path.join(projectRoot, 'drafts');

const candidateRoots = [
  process.env.WITCHCLICK_ROOT && path.resolve(projectRoot, process.env.WITCHCLICK_ROOT),
  path.resolve(projectRoot, '..', 'witchclick'),
  path.resolve(projectRoot, '..'),
].filter(Boolean);

function resolveIngestDir() {
  for (const root of candidateRoots) {
    const ingestPath = path.join(root, 'content', 'prompt-queue', 'approved');
    if (existsSync(path.join(root, 'content'))) {
      return ingestPath;
    }
  }

  const fallbackRoot = candidateRoots[0] ?? projectRoot;
  return path.join(fallbackRoot, 'content', 'prompt-queue', 'approved');
}

const ingestDir = resolveIngestDir();

async function main() {
  const [, , rawSlug] = process.argv;
  if (!rawSlug) {
    console.error('Usage: summon promote -- <spell-slug> (e.g., summon promote -- whispering-hex)');
    process.exit(1);
  }

  const slug = rawSlug.replace(/\.json$/, '');
  const draftPath = path.join(draftsDir, `${slug}.json`);
  let raw;
  try {
    raw = await readFile(draftPath, 'utf8');
  } catch (err) {
    console.error(`Blighted Scroll! Could not find or read draft at ${draftPath}:`, err.message ?? err);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Corrupted Incantation! Draft is not valid JSON, check your runes: ${err.message ?? err}`);
    process.exit(1);
  }

  const validation = PostSpecV2Schema.safeParse(parsed);
  if (!validation.success) {
    console.error('Foul Play! Draft failed PostSpec v2 validation. Mend these broken threads before promoting:');
    for (const issue of validation.error.issues) {
      console.error(` • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }

  await mkdir(ingestDir, { recursive: true });
  const targetPath = path.join(ingestDir, `${slug}.json`);
  await copyFile(draftPath, targetPath);

  console.log(`✅ ${slug} is validated and ready for WitchClick ingest at ${targetPath}`);
}

main();
