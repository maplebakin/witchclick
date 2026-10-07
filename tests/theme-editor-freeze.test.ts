import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const repo = path.resolve(import.meta.dirname, '..');
const nativeFetch = globalThis.fetch;
const preset = {
  slug: 'freeze-fixture', label: 'Freeze fixture', mode: 'midnight',
  settings: { primary: '#332244', accent: '#d4a373', background: '#120725', fontSerif: 'Literata', fontScript: 'Parisienne' },
};

function treeHashes(directory: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [name, hash] of Object.entries(treeHashes(file))) result[`${entry.name}/${name}`] = hash;
    } else result[entry.name] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  return result;
}

describe('retired Theme Editor API preservation', () => {
  let temporary: string;
  let server: Server;
  let url: string;
  let restoreCwd: ReturnType<typeof vi.spyOn>;
  let baseline: Record<string, string>;
  beforeAll(async () => {
    temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'wc-theme-freeze-'));
    for (const file of ['src/styles/color-tokens.generated.css']) {
      const destination = path.join(temporary, file);
      await fsp.mkdir(path.dirname(destination), { recursive: true });
      await fsp.copyFile(path.join(repo, file), destination);
    }
    await fsp.cp(path.join(repo, 'docs/archive/theme-system'), path.join(temporary, 'docs/archive/theme-system'), { recursive: true });
    restoreCwd = vi.spyOn(process, 'cwd').mockReturnValue(temporary);
    vi.stubEnv('DEV_API_TOKEN', '');
    vi.resetModules();
    ({ server } = await import('../dev-api.js'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test server address');
    url = `http://127.0.0.1:${address.port}`;
    baseline = treeHashes(temporary);
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    restoreCwd.mockRestore();
    vi.unstubAllEnvs();
    await fsp.rm(temporary, { recursive: true, force: true });
  });

  async function post(route: string, body: unknown = {}) {
    return nativeFetch(`${url}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  it.each([
    ['/themes/save', { ...preset, label: 'Must not overwrite' }],
    ['/themes/set-active', { slug: preset.slug, mode: preset.mode }],
    ['/themes/delete', { slug: preset.slug, mode: preset.mode }],
    ['/color-tokens/save', { tokens: { midnight: { textBody: '#abcdef' }, dawn: { textBody: '#123456' } } }],
    ['/upload/theme-background', { filename: 'must-not-upload.png', contentBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCuoAAAAASUVORK5CYII=' }],
  ])('rejects valid write attempt %s without changing any fixture file', async (route, payload) => {
    const response = await post(route as string, payload);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: 'Not found' });
    expect(treeHashes(temporary)).toEqual(baseline);
    for (const legacy of ['content/themes', 'content/theme.json', 'content/color-tokens.json']) {
      expect(fs.existsSync(path.join(temporary, legacy)), legacy).toBe(false);
    }
    expect(fs.existsSync(path.join(temporary, 'src/data/themes.generated.json'))).toBe(false);
    expect(fs.existsSync(path.join(temporary, 'src/styles/themes.generated.css'))).toBe(false);
    expect(fs.existsSync(path.join(temporary, 'public/images/theme-backgrounds'))).toBe(false);
  });

  it('keeps retired read routes absent without changing historical files', async () => {
    for (let iteration = 0; iteration < 2; iteration++) {
      for (const route of ['/themes/list', '/color-tokens/get', '/themes/list-backgrounds']) {
        const response = await post(route);
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ ok: false, error: 'Not found' });
      }
    }
    expect(treeHashes(temporary)).toEqual(baseline);
    for (const legacy of ['content/themes', 'content/theme.json', 'content/color-tokens.json']) {
      expect(fs.existsSync(path.join(temporary, legacy)), legacy).toBe(false);
    }
    expect(fs.existsSync(path.join(temporary, 'src/data/themes.generated.json'))).toBe(false);
    expect(fs.existsSync(path.join(temporary, 'src/styles/themes.generated.css'))).toBe(false);
    expect(fs.existsSync(path.join(temporary, 'public/images/theme-backgrounds'))).toBe(false);
  });

  it('leaves unrelated API routes reachable', async () => {
    const response = await post('/ping');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    const invalidHero = await post('/posts/attach-hero', {});
    expect(invalidHero.status).not.toBe(403);
    expect((await invalidHero.json()).code).not.toBe('THEME_EDITOR_FROZEN');
  });

  it('preserves token rejection and authorized access on a non-theme route', async () => {
    // Import a separate instance so the token captured at module load is explicit.
    vi.stubEnv('DEV_API_TOKEN', 'retirement-guard-fixture');
    vi.resetModules();
    const { server: guarded } = await import('../dev-api.js');
    await new Promise<void>(resolve => guarded.listen(0, '127.0.0.1', resolve));
    try {
      const address = guarded.address();
      if (!address || typeof address === 'string') throw new Error('No guard server address');
      const endpoint = `http://127.0.0.1:${address.port}/posts/attach-hero`;
      for (const headers of [{}, { Authorization: 'Bearer wrong-token' }] as Record<string, string>[]) {
        const denied = await nativeFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });
        expect(denied.status).toBe(401);
      }
      const allowed = await nativeFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer retirement-guard-fixture' }, body: '{}' });
      // Credentials pass, then the unchanged hero handler rejects an invalid body.
      expect(allowed.status).toBe(400);
      for (const route of ['/themes/list', '/themes/list-backgrounds', '/themes/save', '/themes/set-active', '/themes/delete', '/upload/theme-background', '/color-tokens/get', '/color-tokens/save']) {
        const retired = await nativeFetch(`http://127.0.0.1:${address.port}${route}`, { method: 'POST', headers: { Authorization: 'Bearer retirement-guard-fixture' } });
        expect(retired.status, route).toBe(404);
        expect(await retired.json()).toEqual({ ok: false, error: 'Not found' });
      }
      expect(treeHashes(temporary)).toEqual(baseline);
      for (const legacy of ['content/themes', 'content/theme.json', 'content/color-tokens.json']) {
        expect(fs.existsSync(path.join(temporary, legacy)), legacy).toBe(false);
      }
    } finally {
      await new Promise<void>((resolve, reject) => guarded.close(error => error ? reject(error) : resolve()));
      vi.stubEnv('DEV_API_TOKEN', '');
    }
  });

});
