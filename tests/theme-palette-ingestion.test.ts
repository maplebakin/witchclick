import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const repo = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(repo, 'src/theme-kits/autumn-window/1.0.0/kit.css'), 'utf8');
const original = JSON.parse(fs.readFileSync(path.join(repo, 'src/theme-kits/autumn-window/1.0.0/manifest.json'), 'utf8'));
const payload = () => ({ manifest: { ...structuredClone(original), kitId: 'witchclick.fixture', version: '2.0.0' }, css });
const token = 'disposable-palette-token';
const nativeFetch = globalThis.fetch;
function files(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]).sort();
}

describe('palette ingestion on an isolated dev API root', () => {
  let temporary: string;
  let server: Server;
  let url: string;
  let cwd: ReturnType<typeof vi.spyOn>;
  beforeAll(async () => {
    temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'wc-palette-ingest-'));
    cwd = vi.spyOn(process, 'cwd').mockReturnValue(temporary);
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('VITEST', 'true');
    vi.stubEnv('ADMIN_API_TOKEN', token); vi.stubEnv('THEME_ADMIN_TOKEN', ''); vi.stubEnv('DEV_API_TOKEN', '');
    vi.stubEnv('WITCHCLICK_STAGING_LOOPBACK', '1');
    vi.resetModules();
    ({ server } = await import('../dev-api.js'));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No isolated API address');
    url = `http://127.0.0.1:${address.port}`;
  });
  beforeEach(async () => { await fsp.rm(path.join(temporary, 'src'), { recursive: true, force: true }); });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    cwd.mockRestore(); vi.unstubAllEnvs();
    await fsp.rm(temporary, { recursive: true, force: true });
  });
  const post = (body: unknown, headers: Record<string, string> = { Authorization: `Bearer ${token}` }) => nativeFetch(`${url}/palettes/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

  it('writes exactly two files, reports coverage and refuses to overwrite a version', async () => {
    const input = payload();
    const response = await post(input);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, kitId: 'witchclick.fixture', version: '2.0.0', path: 'src/theme-kits/witchclick.fixture/2.0.0', requiredSemantics: false, missingCount: 16, missingRequiredCount: 9, status: 'Ingested', message: expect.stringContaining('Shelved, not active') });
    const written = files(temporary);
    expect(written.map(file => path.relative(temporary, file))).toEqual(['src/theme-kits/witchclick.fixture/2.0.0/kit.css', 'src/theme-kits/witchclick.fixture/2.0.0/manifest.json']);
    expect(fs.readFileSync(written[0]!, 'utf8')).toBe(css);
    const before = written.map(file => fs.readFileSync(file));
    expect((await post(input)).status).toBe(409);
    expect(written.map(file => fs.readFileSync(file))).toEqual(before);
  });

  it('accepts manifest text and X-Witchclick-Admin-Secret with the existing token precedence', async () => {
    const input = payload();
    const response = await post({ ...input, manifest: JSON.stringify(input.manifest) }, { 'X-Witchclick-Admin-Secret': token });
    expect(response.status).toBe(200);
    expect(fs.readFileSync(path.join(temporary, 'src/theme-kits/witchclick.fixture/2.0.0/manifest.json'), 'utf8')).toBe(JSON.stringify(input.manifest));
  });

  it('rejects duplicate logical identity even when a kit lives under an older directory name', async () => {
    const destination = path.join(temporary, 'src/theme-kits/legacy-name/2.0.0');
    await fsp.mkdir(destination, { recursive: true });
    await fsp.writeFile(path.join(destination, 'manifest.json'), JSON.stringify(payload().manifest));
    await fsp.writeFile(path.join(destination, 'kit.css'), css);
    expect((await post(payload())).status).toBe(409);
    expect(files(temporary)).toHaveLength(2);
  });

  it.each(['none', 'wrong', 'public-dev-key'])('rejects %s credentials despite loopback and the staging flag', async kind => {
    const headers = kind === 'wrong' ? { Authorization: 'Bearer wrong' } : kind === 'public-dev-key' ? { 'X-WC-Dev-Key': token } : {};
    expect((await post(payload(), headers as Record<string, string>)).status).toBe(401);
    expect(files(temporary)).toEqual([]);
  });

  it.each(['hash', 'id traversal', 'version traversal', 'schema', 'contract', 'namespace', 'css filename', 'modes', 'roles', 'role status', 'present value', 'missing reason', 'provenance', 'JSON', 'size'])('rejects invalid %s without writes', async kind => {
    const input = payload();
    if (kind === 'hash') input.manifest.integrity.sha256 = '0'.repeat(64);
    if (kind === 'id traversal') input.manifest.kitId = '../escape';
    if (kind === 'version traversal') input.manifest.version = '../escape';
    if (kind === 'schema') delete input.manifest.schemaVersion;
    if (kind === 'contract') input.manifest.contractVersion = '99';
    if (kind === 'namespace') input.manifest.namespace = '--theme-';
    if (kind === 'css filename') input.manifest.cssFile = '../other.css';
    if (kind === 'modes') input.manifest.supportedModes = [];
    if (kind === 'roles') delete input.manifest.roles;
    if (kind === 'role status') delete input.manifest.roles[0].modes.midnight.status;
    if (kind === 'present value') input.manifest.roles[0].modes.midnight.value = '#ffffff';
    if (kind === 'missing reason') delete input.manifest.roles.find((role: { id: string }) => role.id === 'entity.border').modes.midnight.reason;
    if (kind === 'provenance') delete input.manifest.provenance;
    if (kind === 'size') input.css += ' '.repeat(256 * 1024);
    const response = await post(kind === 'JSON' ? { ...input, manifest: '{bad' } : input);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBeTruthy();
    expect(files(temporary)).toEqual([]);
  });

  it.each(['body { color: red; }', '@import "https://example.com/a.css";', '.wc-kit-test[data-wc-kit-mode="midnight"] { margin: 0; }', '.wc-kit-test[data-wc-kit-mode="midnight"] { --text-body: #fff; }', '.wc-kit-test[data-wc-kit-mode="midnight"] { --wc-kit-font: Arial; }', '.wc-kit-test[data-wc-kit-mode="midnight"] { --wc-kit-network: url(https://example.com); }'])('rejects forbidden CSS %s even with a matching hash', async addition => {
    const input = payload(); input.css += addition;
    input.manifest.integrity.sha256 = createHash('sha256').update(input.css).digest('hex');
    expect((await post(input)).status).toBe(400);
    expect(files(temporary)).toEqual([]);
  });

  it('rejects missing declared modes and symlinked write roots', async () => {
    const input = payload(); input.manifest.supportedModes.push('extra-mode');
    expect((await post(input)).status).toBe(400);
    const outside = await fsp.mkdtemp(path.join(os.tmpdir(), 'wc-outside-'));
    try {
      await fsp.mkdir(path.join(temporary, 'src'));
      await fsp.symlink(outside, path.join(temporary, 'src/theme-kits'));
      expect((await post(payload())).status).toBe(400);
      expect(files(outside)).toEqual([]);
    } finally { await fsp.rm(outside, { recursive: true, force: true }); }
  });

  it('allows only one of two concurrent requests for the same version', async () => {
    const responses = await Promise.all([post(payload()), post(payload())]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(files(temporary)).toHaveLength(2);
  });

  it('rejects palette ingestion in production even with a valid token', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.resetModules();
    const { server: production } = await import('../dev-api.js');
    await new Promise<void>(resolve => production.listen(0, '127.0.0.1', resolve));
    try {
      const address = production.address();
      if (!address || typeof address === 'string') throw new Error('No production fixture address');
      const response = await nativeFetch(`http://127.0.0.1:${address.port}/palettes/ingest`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      expect(response.status).toBe(404);
      expect(files(temporary)).toEqual([]);
    } finally {
      await new Promise<void>((resolve, reject) => production.close(error => error ? reject(error) : resolve()));
      vi.stubEnv('NODE_ENV', 'test');
    }
  });
});
