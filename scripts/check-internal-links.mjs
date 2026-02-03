import fs from 'node:fs/promises';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const LINK_ATTR_PATTERN = /\b(?:href|src)=["']([^"']+)["']/gi;
const IGNORE_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'javascript:', '//'];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeLink(rawLink) {
  const withoutHash = rawLink.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  const trimmed = withoutQuery.trim();
  try {
    return decodeURI(trimmed);
  } catch {
    return trimmed;
  }
}

function shouldSkipLink(link) {
  if (!link || link === '#') return true;
  return IGNORE_PREFIXES.some((prefix) => link.startsWith(prefix));
}

function buildCandidatePaths(sourceFile, linkPath) {
  const resolvedBase = linkPath.startsWith('/')
    ? path.join(DIST_DIR, linkPath.slice(1))
    : path.resolve(path.dirname(sourceFile), linkPath);

  const candidates = [];
  const hasExt = path.extname(resolvedBase) !== '';
  const hasTrailingSlash = linkPath.endsWith('/');

  if (hasTrailingSlash) {
    candidates.push(path.join(resolvedBase, 'index.html'));
    return candidates;
  }

  if (hasExt) {
    candidates.push(resolvedBase);
    return candidates;
  }

  candidates.push(resolvedBase);
  candidates.push(`${resolvedBase}.html`);
  candidates.push(path.join(resolvedBase, 'index.html'));
  return candidates;
}

function relativeToDist(filePath) {
  return path.relative(DIST_DIR, filePath) || 'index.html';
}

async function run() {
  if (!(await exists(DIST_DIR))) {
    console.error(`❌ dist directory not found: ${DIST_DIR}`);
    process.exit(1);
  }

  const htmlFiles = await collectHtmlFiles(DIST_DIR);
  let checkedLinks = 0;
  const broken = [];

  for (const filePath of htmlFiles) {
    const html = await fs.readFile(filePath, 'utf8');
    const scanHtml = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    let match;
    while ((match = LINK_ATTR_PATTERN.exec(scanHtml)) !== null) {
      const rawLink = match[1] ?? '';
      const linkPath = normalizeLink(rawLink);
      if (shouldSkipLink(linkPath)) continue;

      checkedLinks += 1;
      const candidates = buildCandidatePaths(filePath, linkPath);
      let valid = false;
      for (const candidate of candidates) {
        if (!candidate.startsWith(DIST_DIR)) continue;
        if (await exists(candidate)) {
          valid = true;
          break;
        }
      }

      if (!valid) {
        broken.push({
          from: relativeToDist(filePath),
          link: linkPath,
          tried: candidates.map((candidate) => path.relative(DIST_DIR, candidate)),
        });
      }
    }
  }

  if (broken.length > 0) {
    console.error(`❌ Found ${broken.length} broken internal link(s) across ${htmlFiles.length} HTML files.`);
    for (const item of broken.slice(0, 100)) {
      console.error(`- ${item.from} -> ${item.link}`);
      console.error(`  tried: ${item.tried.join(', ')}`);
    }
    if (broken.length > 100) {
      console.error(`...and ${broken.length - 100} more.`);
    }
    process.exit(1);
  }

  console.log(`✅ Internal link check passed (${checkedLinks} links across ${htmlFiles.length} HTML files).`);
}

await run();
