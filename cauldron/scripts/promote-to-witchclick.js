#!/usr/bin/env node
import { readFile, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostSpecV2Schema } from '../../server/lib/postSpecSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const witchclickRoot = path.resolve(projectRoot, '..');
const draftsDir = path.join(projectRoot, 'drafts');
const ingestDir = path.join(witchclickRoot, 'content', 'prompt-queue', 'approved');

async function main() {
  const [, , rawSlug] = process.argv;
  if (!rawSlug) {
    console.error('Usage: npm run promote -- <slug>');
    process.exit(1);
  }

  const slug = rawSlug.replace(/\.json$/, '');
  const draftPath = path.join(draftsDir, `${slug}.json`);
  let raw;
  try {
    raw = await readFile(draftPath, 'utf8');
  } catch (err) {
    console.error(`Could not read draft at ${draftPath}:`, err.message ?? err);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Draft is not valid JSON: ${err.message ?? err}`);
    process.exit(1);
  }

  const validation = PostSpecV2Schema.safeParse(parsed);
  if (!validation.success) {
    console.error('Draft failed PostSpec v2 validation. Fix these issues before promoting:');
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
