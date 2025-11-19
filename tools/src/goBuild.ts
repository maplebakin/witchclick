import * as fs from 'fs';
import * as path from 'path';


export function goBuild(): void {
const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PRODUCTS_FILE = path.join(CONTENT_DIR, 'products.json');


let products: Array<{ key?: string; url?: string; utm?: string }> = [];


try {
const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
const data = JSON.parse(raw);
const arr = Array.isArray(data) ? data : (Array.isArray((data as any).products) ? (data as any).products : []);
products = arr as Array<{ key?: string; url?: string; utm?: string }>;
} catch {
products = [];
}


fs.mkdirSync(PUBLIC_DIR, { recursive: true });


const lines: string[] = [];
for (const p of products) {
const key = safeKey(p.key);
if (!key || !p.url) continue;
const target = appendUtm(String(p.url), p.utm ? String(p.utm) : undefined);
lines.push(`/go/${key} ${target} 301!`);
}


const redirectsPath = path.join(PUBLIC_DIR, '_redirects');
const content = lines.length ? lines.join(String.fromCharCode(10)) + String.fromCharCode(10) : '';

if (content) {
fs.writeFileSync(redirectsPath, content, 'utf8');
} else if (fs.existsSync(redirectsPath)) {
fs.rmSync(redirectsPath);
}

process.stdout.write(`Built ${lines.length} redirects -> ${redirectsPath}
`);
}


function safeKey(v?: string): string {
if (!v) return '';
return String(v)
.trim()
.toLowerCase()
.replace(/[^a-z0-9-]/g, '-')
.replace(/--+/g, '-');
}


function appendUtm(url: string, utm?: string): string {
if (!utm) return url;
try {
const u = new URL(url);
const extra = new URLSearchParams(utm.startsWith('?') ? utm.slice(1) : utm);
extra.forEach((value, key) => u.searchParams.set(key, value));
return u.toString();
} catch {
const sep = url.indexOf('?') !== -1 ? '&' : '?';
return url + sep + utm.replace(/^\?/, '');
}
}
