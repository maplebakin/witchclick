import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import matter from 'gray-matter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveLocalDevApi } from '../scripts/lib/dev-api-config.mjs';
import { GET as astroList } from '../src/pages/api/staging/list.json';

const nativeFetch = globalThis.fetch;
let root: string;
let server: Server | undefined;
let origin: string;
beforeEach(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'wc-local-staging-'));
  fs.mkdirSync(path.join(root, 'src/content/posts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public/images'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public/images/hero.png'), 'fixture');
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  for (const key of ['ADMIN_API_TOKEN', 'THEME_ADMIN_TOKEN', 'DEV_API_TOKEN', 'WITCHCLICK_STAGING_LOOPBACK']) vi.stubEnv(key, '');
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('VITEST', 'true'); vi.stubEnv('DEV_API_LOG', 'false');
});
afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  server = undefined;
  vi.restoreAllMocks(); vi.unstubAllEnvs();
  await fsp.rm(root, { recursive: true, force: true });
});
async function start() {
  vi.resetModules();
  ({ server } = await import('../dev-api.js'));
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server!.address();
  if (!address || typeof address === 'string') throw new Error('No test address');
  origin = `http://127.0.0.1:${address.port}`;
}
const post = (route: string, body: unknown = {}, headers: Record<string, string> = {}) => nativeFetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
function write(slug: string, extra = {}) {
  const file = path.join(root, 'src/content/posts', `${slug}.md`);
  fs.writeFileSync(file, matter.stringify('## Practice\nPause and breathe. Notice the room around you.\n## Reflection\nWrite down what helped.', { slug, title: `Title ${slug}`, draft: true, metaDescription: 'A complete grounding practice with room for reflection.', excerpt: 'A complete grounding practice.', tags: ['focus'], publishedAt: '2025-01-01', wordCount: 700, readingMinutes: 4, heroImage: '/images/hero.png', heroImageAlt: 'A journal on a desk', ...extra }));
  return file;
}

describe('local Staging uses the separately guarded dev API', () => {
  it('lists, previews, publishes and deletes disposable drafts without an admin token or Astro exemption', async () => {
    const file = write('ready'); const removable = write('remove');
    await start();
    const response = await post('/staging/list');
    expect(response.status).toBe(200);
    const list = await response.json();
    expect(list.drafts.find((draft: any) => draft.slug === 'ready')).toMatchObject({ state: 'checks-passed', canPublish: true, wordCount: 700, filePath: 'src/content/posts/ready.md' });
    expect((await (await post('/staging/preview', { slug: 'ready' })).json()).frontmatter.title).toBe('Title ready');
    const result = await post('/staging/publish', { slug: 'ready' });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ publiclyEligibleLocally: true, message: expect.stringContaining('publicly eligible locally') });
    expect(matter.read(file).data.draft).toBe(false);
    expect((await post('/staging/delete', { slug: 'ready' })).status).toBe(400);
    expect((await post('/staging/delete', { slug: 'remove' })).status).toBe(200);
    expect(fs.existsSync(removable)).toBe(false);
    expect((await post('/posts/list')).status).toBe(200);
    const guarded = await astroList({ request: new Request('http://localhost:4321/api/staging/list.json') });
    expect(guarded.status).toBe(500);
    expect(await guarded.json()).toMatchObject({ code: 'SERVER_MISCONFIG' });
  });

  it('enforces current-file readiness and missing-hero acknowledgement through the local transport', async () => {
    const changed = write('changed'); write('artwork', { heroImage: null, heroImageAlt: null });
    await start();
    expect((await post('/staging/preview', { slug: 'changed' })).status).toBe(200);
    fs.writeFileSync(changed, matter.stringify('This was automatically created as a stub. Content coming soon.', matter.read(changed).data));
    const before = fs.readFileSync(changed, 'utf8');
    const rejected = await post('/staging/publish', { slug: 'changed', ready: true, state: 'checks-passed' });
    expect(rejected.status).toBe(409);
    expect((await rejected.json()).code).toBe('NOT_READY');
    expect(fs.readFileSync(changed, 'utf8')).toBe(before);
    expect((await post('/staging/publish', { slug: 'artwork' })).status).toBe(409);
    const accepted = await post('/staging/publish', { slug: 'artwork', acknowledgeMissingHero: true });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({ missingHero: true, warnings: expect.any(Array) });
  });

  it('keeps optional dev-token authentication, CORS, and Astro token authentication separate', async () => {
    write('ready'); vi.stubEnv('DEV_API_TOKEN', 'private-fixture-token');
    await start();
    for (const route of ['/staging/list', '/staging/preview', '/staging/publish', '/staging/delete', '/posts/list']) {
      expect((await post(route)).status).toBe(401);
      expect((await post(route, {}, { 'X-WC-Dev-Key': 'wrong' })).status).toBe(401);
    }
    expect((await post('/staging/list', {}, { 'X-WC-Dev-Key': 'private-fixture-token' })).status).toBe(200);
    expect((await post('/staging/list', {}, { Authorization: 'Bearer private-fixture-token' })).status).toBe(200);
    expect((await post('/staging/list', {}, { Origin: 'https://untrusted.example' })).status).toBe(403);
    expect((await astroList({ request: new Request('http://localhost:4321/api/staging/list.json') })).status).toBe(401);
  });

  it('does not expose the new local staging operations in production', async () => {
    vi.stubEnv('NODE_ENV', 'production'); await start();
    for (const route of ['/staging/list', '/staging/preview', '/staging/publish', '/staging/delete']) expect((await post(route)).status).toBe(404);
  });
});

describe('one validated local admin API origin', () => {
  it('derives the origin from the actual API port, including direct Astro startup', () => {
    expect(resolveLocalDevApi({})).toEqual({ host: '127.0.0.1', port: '8787', origin: 'http://127.0.0.1:8787' });
    expect(resolveLocalDevApi({ DEV_API_PORT: '18787' }).origin).toBe('http://127.0.0.1:18787');
    expect(resolveLocalDevApi({ PUBLIC_DEV_API: 'http://localhost:8787/' }).origin).toBe('http://localhost:8787');
    const config = fs.readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
    expect(config).toContain("apply: 'serve'");
    expect(config).toContain("'import.meta.env.PUBLIC_DEV_API': JSON.stringify(origin)");
    const page = fs.readFileSync(new URL('../src/pages/admin/staging.astro', import.meta.url), 'utf8');
    expect(page).not.toContain('/api/staging/');
    for (const action of ['list', 'preview', 'publish', 'delete']) expect(page).toContain(`/staging/${action}`);
    expect(page).toContain("options.headers['X-WC-Dev-Key']");
  });
  it.each(['http://localhost:4321', 'http://localhost:8787/api', '/api', 'https://remote.example:8787', 'http://user:secret@localhost:8787'])('rejects a crossed or unsafe API origin: %s', PUBLIC_DEV_API => {
    expect(() => resolveLocalDevApi({ PUBLIC_DEV_API })).toThrow('PUBLIC_DEV_API');
  });
  it.each(['8787oops', '65536', '0', '-1'])('rejects an invalid API port: %s', DEV_API_PORT => {
    expect(() => resolveLocalDevApi({ DEV_API_PORT })).toThrow('DEV_API_PORT');
  });
});
