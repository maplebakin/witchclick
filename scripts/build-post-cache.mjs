
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { loadAllPosts, extractHeadingOutline } from '../src/utils/posts.js';
import { autoLinkAffiliates } from '../tools/src/auto-affiliate.js';
import { readSettings, getSiteOrigin, buildCanonicalUrl, toAbsoluteUrl } from '../src/utils/settings.js';
import { getRelatedPosts } from '../src/utils/recommendations.js';

const CWD = process.cwd();
const CACHE_DIR = path.join(CWD, '.cache/post-data');
const PRODUCTS_FILE = path.join(CWD, 'content/products.json');

// --- JSDOM and DOMPurify Setup ---
const dom = new JSDOM('<body></body>');
const DOMPurify = createDOMPurify(dom.window);

// --- Simple Slugger (from original file) ---
class Slugger {
  constructor() {
    this.seen = {};
  }
  slug(text) {
    let slug = text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    const originalSlug = slug;
    let count = this.seen[originalSlug] || 0;
    if (count > 0) {
      slug = `${originalSlug}-${count}`;
    }
    this.seen[originalSlug] = count + 1;
    return slug;
  }
}

async function processPost(post) {
  const settings = readSettings();
  const allProducts = fs.existsSync(PRODUCTS_FILE) ? JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8')).products || [] : [];
  
  // 1. Process Markdown and Sanitize HTML
  let html = DOMPurify.sanitize(marked.parse(post.content || ""), { USE_PROFILES: { html: true } });

  // 2. Add IDs to Headings
  const wrapper = dom.window.document.createElement("div");
  wrapper.innerHTML = html;
  const slugger = new Slugger();
  const headingNodes = wrapper.querySelectorAll("h2, h3, h4");
  headingNodes.forEach((node) => {
    const text = node.textContent?.trim();
    if (!text) return;
    const existing = node.getAttribute("id");
    const id = existing && existing.trim().length ? existing : slugger.slug(text);
    node.setAttribute("id", id);
  });
  html = wrapper.innerHTML;

  // 3. Inject Affiliate Links
  let hasAffiliates = false;
  const { html: nextHtml, count } = autoLinkAffiliates(html, allProducts, { maxLinksPerPost: 3 });
  if (count > 0) {
    html = nextHtml;
    hasAffiliates = true;
  }

  // 4. Consolidate and prepare all data
  const relatedPosts = getRelatedPosts({
    currentSlug: post.slug,
    currentData: post.data,
    limit: 4,
  });

  const headingOutline = extractHeadingOutline(post.content, { minLevel: 2, maxLevel: 3 });
  
  // ... other data processing from the original file would go here ...
  // (author resolution, OG image path, etc.)

  const processedData = {
    slug: post.slug,
    data: post.data,
    tldr: post.tldr,
    spoons: post.spoons,
    content: html,
    hasAffiliates,
    relatedPosts,
    headingOutline,
    // Add other processed fields here
  };

  return processedData;
}

async function buildCache() {
  console.log("Starting post cache build...");
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const posts = loadAllPosts();
  let count = 0;

  for (const post of posts) {
    try {
      const processedPost = await processPost(post);
      const outputPath = path.join(CACHE_DIR, `${post.slug}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(processedPost, null, 2));
      count++;
    } catch (error) {
      console.error(`Failed to process post: ${post.slug}`, error);
    }
  }

  console.log(`Successfully processed and cached ${count} posts.`);
}

buildCache();
