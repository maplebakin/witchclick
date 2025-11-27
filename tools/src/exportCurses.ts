import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

function readCurseFiles(dir: string) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

function renderCard(data: Record<string, any>, body: string) {
  const title = String(data?.title ?? 'Untitled');
  const invocation = String(data?.invocation ?? '');
  const generator = data?.generator ?? {};
  const sections = body.split(/\n##\s+/).map((block, idx) => {
    if (idx === 0) return { heading: 'Opening Reflection', content: block.trim() };
    const headingEnd = block.indexOf('\n');
    const heading = headingEnd === -1 ? block.trim() : block.slice(0, headingEnd).trim();
    const content = headingEnd === -1 ? '' : block.slice(headingEnd + 1).trim();
    return { heading, content };
  });

  return `
    <article class="card">
      <h2>${title}</h2>
      ${invocation ? `<p class="invocation">${invocation}</p>` : ''}
      <dl class="meta">
        <div><dt>Type</dt><dd>${generator?.type ?? ''}</dd></div>
        <div><dt>Target</dt><dd>${generator?.target ?? ''}</dd></div>
        <div><dt>Tone</dt><dd>${generator?.tone ?? ''}</dd></div>
        ${generator?.sigilName ? `<div><dt>Sigil</dt><dd>${generator.sigilName}</dd></div>` : ''}
        ${generator?.altarItem ? `<div><dt>Altar</dt><dd>${generator.altarItem}</dd></div>` : ''}
      </dl>
      ${sections
        .map(
          (section) => `
            <section class="section">
              <h3>${section.heading}</h3>
              <p>${section.content.replace(/\n/g, '<br>')}</p>
            </section>
          `,
        )
        .join('')}
      ${generator?.journalingFollowUp ? `<section class="section journal"><h3>Journaling</h3><p>${generator.journalingFollowUp}</p></section>` : ''}
    </article>
  `;
}

export function exportCurses(args: string[]) {
  const slugArgIndex = args.indexOf('--slug');
  const slug = slugArgIndex >= 0 ? String(args[slugArgIndex + 1] || '').toLowerCase() : '';

  const CWD = process.cwd();
  const DIR = path.join(CWD, 'archive', 'curses');
  const OUT_DIR = path.join(CWD, 'dist', 'exports', 'curses');

  const files = readCurseFiles(DIR);
  if (!files.length) {
    throw new Error('No curses found. Make sure archive/curses exists.');
  }

  const selected = slug
    ? files.filter((file) => path.basename(file, '.md').toLowerCase() === slug)
    : files;

  if (!selected.length) {
    throw new Error(`Curse not found for slug: ${slug}`);
  }

  const cards = selected
    .map((file) => {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      return renderCard(data ?? {}, content ?? '');
    })
    .join('\n');

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>White Magic Curses — Printable Cards</title>
<style>
  body{font-family:"Inter",system-ui,-apple-system,Segoe UI,sans-serif;background:#f7f5ff;color:#2f1258;margin:0;padding:2rem;}
  .grid{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));}
  .card{background:#fff;border-radius:16px;padding:1.5rem;border:1px solid #e6dcff;box-shadow:0 12px 24px rgba(95,69,191,0.1);}
  .card h2{margin:0 0 0.5rem;font-size:1.25rem;}
  .invocation{font-style:italic;color:#6b4ca5;margin:0 0 1rem;}
  .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.5rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#6b4ca5;margin:0 0 1rem;}
  .meta dt{font-weight:600;}
  .meta dd{margin:0;color:#2f1258;font-weight:500;text-transform:none;letter-spacing:normal;}
  .section{margin-top:1rem;font-size:0.9rem;line-height:1.5;}
  .section h3{text-transform:uppercase;font-size:0.75rem;letter-spacing:0.08em;margin:0 0 0.25rem;color:#6b4ca5;}
  .section p{margin:0;white-space:pre-wrap;}
  .journal{background:#f1ebff;border-radius:12px;padding:1rem;}
</style>
</head>
<body>
  <h1 style="text-align:center;margin-bottom:1.5rem;">White Magic Curses</h1>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, slug ? `${slug}.html` : 'curses.html');
  fs.writeFileSync(outPath, page, 'utf8');
  process.stdout.write(`Wrote ${path.relative(CWD, outPath)}\n`);
}
