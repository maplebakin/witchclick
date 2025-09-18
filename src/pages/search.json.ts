import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';


export async function GET() {
const postsDir = path.join(process.cwd(), 'content', 'posts');
const files = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.md')) : [];
const items = files.map(file => {
const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
const { data } = matter(raw);
const slug = (data?.slug ? String(data.slug) : file.replace(/\.md$/, '')).toLowerCase();
return {
slug,
title: String(data?.title || slug),
excerpt: String(data?.excerpt || data?.description || data?.metaDescription || ''),
tags: Array.isArray(data?.tags) ? data.tags : []
};
});
return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}