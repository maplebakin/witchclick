#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const postsDistDir = path.join(distDir, 'post');
const settingsPath = path.join(rootDir, 'content', 'settings.json');

const placeholderPhrases = [
  'check back soon',
  'coming soon',
  'nothing here yet',
  'lore in progress',
  'no tools to share yet',
  'this area is brewing',
];

const checks = [];
const failures = [];

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
  };
}

function walkFiles(dir, extensionPattern) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, extensionPattern));
      continue;
    }

    if (entry.isFile() && extensionPattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relativeFromRoot(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function summarizeOutput(output) {
  const lines = output.split('\n').map((line) => line.trimEnd()).filter(Boolean);
  return lines.slice(-12).join('\n');
}

function pass(name, detail = '') {
  checks.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  failures.push(`${name}: ${detail}`);
  console.error(`❌ ${name} — ${detail}`);
  printSummary();
  process.exit(1);
}

function runScriptCheck(name, npmScript) {
  const result = runCommand('npm', ['run', npmScript]);
  if (result.status === 0) {
    pass(name);
    return;
  }

  fail(name, summarizeOutput(result.output) || `npm run ${npmScript} exited with code ${result.status}`);
}

function scanDistForPlaceholderPhrases() {
  if (!fs.existsSync(distDir)) {
    fail('Placeholder phrase scan', `dist directory not found at ${distDir}`);
  }

  const htmlFiles = walkFiles(distDir, /\.html$/);
  const matches = [];

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8').toLowerCase();
    const phrase = placeholderPhrases.find((item) => html.includes(item));
    if (!phrase) continue;

    const route = `/${relativeFromRoot(filePath)
      .replace(/^dist\//, '')
      .replace(/\/index\.html$/, '/')
      .replace(/\.html$/, '')}`.replace(/\/{2,}/g, '/');

    matches.push(`${route} (${phrase})`);
  }

  if (matches.length > 0) {
    fail('Placeholder phrase scan', `found ${matches.length} public placeholder page(s): ${matches.join(', ')}`);
  }

  pass('Placeholder phrase scan', `0 matching public pages across ${htmlFiles.length} HTML files`);
}

function extractMetaContent(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
}

function verifyOgImages() {
  if (!fs.existsSync(postsDistDir)) {
    fail('OG image verification', `post output directory not found at ${postsDistDir}`);
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const siteUrl = String(settings.siteUrl || '').replace(/\/$/, '');
  if (!siteUrl) {
    fail('OG image verification', 'content/settings.json is missing siteUrl');
  }

  const postHtmlFiles = walkFiles(postsDistDir, /\.html$/);
  const broken = [];

  for (const filePath of postHtmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    const ogImage = extractMetaContent(html, 'og:image');
    if (!ogImage) continue;
    if (!ogImage.startsWith(`${siteUrl}/`)) continue;

    const relativeAssetPath = decodeURIComponent(ogImage.slice(siteUrl.length + 1));
    const publicPath = path.join(publicDir, relativeAssetPath);
    if (fs.existsSync(publicPath)) continue;

    broken.push({
      route: `/${path.relative(postsDistDir, filePath).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '')}`,
      ogImage,
      publicPath: relativeFromRoot(publicPath),
    });
  }

  if (broken.length > 0) {
    const detail = broken
      .slice(0, 10)
      .map((item) => `${item.route} -> ${item.ogImage} (missing ${item.publicPath})`)
      .join('; ');
    fail('OG image verification', `found ${broken.length} same-origin og:image path(s) without public files: ${detail}`);
  }

  pass('OG image verification', `0 broken same-origin og:image paths across ${postHtmlFiles.length} post pages`);
}

function printSummary() {
  const passedCount = checks.filter((check) => check.ok).length;
  const failedCount = checks.filter((check) => !check.ok).length;

  console.log('\nPre-traffic gate summary');
  console.log(`✅ ${passedCount} checks passed`);
  console.log(`❌ ${failedCount} checks failed`);

  if (failures.length === 0) return;

  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
}

function main() {
  runScriptCheck('Build pipeline', 'build');
  pass('Draft leak verification', 'covered by npm run build');
  runScriptCheck('Internal link check', 'linkcheck');
  runScriptCheck('SEO audit', 'audit:seo');
  runScriptCheck('Affiliate configuration check', 'check:affiliates');
  scanDistForPlaceholderPhrases();
  verifyOgImages();
  printSummary();
}

main();
