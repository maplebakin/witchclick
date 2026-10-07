import fs from 'node:fs';
import { resolveLocalDevApi } from '../scripts/lib/dev-api-config.mjs';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
const wrapper = read('scripts/dev-with-api.mjs');

function startWrapper() {
  const children: Array<EventEmitter & { killed: boolean; kill: ReturnType<typeof vi.fn>; stdout: EventEmitter; stderr: EventEmitter }> = [];
  const spawn = vi.fn(() => {
    const child = Object.assign(new EventEmitter(), {
      killed: false,
      kill: vi.fn(() => { child.killed = true; }),
      stdout: new EventEmitter(), stderr: new EventEmitter(),
    });
    children.push(child);
    return child;
  });
  const process = Object.assign(new EventEmitter(), {
    env: {}, cwd: () => '/fixture', exit: vi.fn(),
    stdout: { write: vi.fn() }, stderr: { write: vi.fn() },
  });
  runInNewContext(wrapper.replace(/^import .*;\n/gm, ''), { spawn, process, loadEnv: () => ({}), resolveLocalDevApi, console: { error: vi.fn() } });
  return { spawn, children, process };
}

describe('detached historical preset generation', () => {
  it('retains unrelated prebuild and dev commands without a generation hook', () => {
    expect(scripts.prebuild).toBe('node ./scripts/ensure-npm-proxy.mjs && npm run build:admin-scripts');
    expect(scripts['themes:lint']).toBe('node ./scripts/themes-lint.mjs');
    expect(scripts.dev).toBe('node ./scripts/dev-with-api.mjs');
    expect(scripts['dev:all']).toBe(scripts.dev);
    expect(scripts['dev:host']).toBe('HOST=0.0.0.0 node ./scripts/dev-with-api.mjs');
    expect(scripts['build:admin-scripts']).toBe('node ./scripts/build-admin-scripts.mjs');
    expect(scripts).not.toHaveProperty('themes:build');
    expect(scripts).not.toHaveProperty('themes:watch');
    expect(Object.values(scripts).join('\n')).not.toContain('generate-theme-css');
    expect(wrapper).not.toMatch(/generate-theme-css|themeProcess|Theme watcher/);
  });

  it('starts only the API, then Astro after API readiness, once', () => {
    const { spawn, children } = startWrapper();
    expect(spawn.mock.calls).toHaveLength(1);
    expect(spawn.mock.calls[0]).toEqual(['node', ['./dev-api.js'], expect.any(Object)]);
    children[0]!.stdout.emit('data', '[dev-api] listening on http://127.0.0.1:8787');
    children[0]!.stdout.emit('data', '[dev-api] listening on http://127.0.0.1:8787');
    expect(spawn.mock.calls).toHaveLength(2);
    expect(spawn.mock.calls[1]).toEqual(['astro', ['dev'], expect.any(Object)]);
  });

  it.each(['SIGINT', 'SIGTERM'])('stops only its two children on %s', (signal) => {
    const { children, process } = startWrapper();
    children[0]!.stdout.emit('data', '[dev-api] listening on localhost');
    process.emit(signal);
    process.emit(signal);
    for (const child of children) expect(child.kill.mock.calls).toEqual([[signal]]);
    expect(process.exit.mock.calls).toEqual([[0]]);
  });

  it.each([0, 1])('stops the API when Astro exits with code %s', (code) => {
    const { children, process } = startWrapper();
    children[0]!.stdout.emit('data', '[dev-api] listening on localhost');
    children[1]!.emit('exit', code);
    expect(children[0]!.kill).toHaveBeenCalledOnce();
    expect(process.exit).toHaveBeenCalledWith(code);
  });

  it('stops Astro when the ready API exits, and does not start Astro on early API failure', () => {
    const ready = startWrapper();
    ready.children[0]!.stdout.emit('data', '[dev-api] listening on localhost');
    ready.children[0]!.emit('exit', 1);
    expect(ready.children[1]!.kill).toHaveBeenCalledOnce();
    expect(ready.process.exit).toHaveBeenCalledWith(1);
    const failed = startWrapper();
    failed.children[0]!.emit('exit', 1);
    expect(failed.spawn).toHaveBeenCalledOnce();
    expect(failed.process.exit).toHaveBeenCalledWith(1);
  });

  it('keeps removed preset artifacts absent and documented commands retired', () => {
    for (const path of ['scripts/generate-theme-css.mjs', 'src/styles/themes.generated.css', 'src/data/themes.generated.json']) {
      expect(fs.existsSync(new URL(`../${path}`, import.meta.url))).toBe(false);
    }
    expect(read('README.md')).not.toMatch(/^- `npm run themes:(build|watch)`/m);
    expect(read('THEMES.md')).toContain('Historical preset-generation workflow — retired');
    expect(read('THEMES.md')).not.toMatch(/^\s*(?:npm run|run:) themes:(build|watch)/m);
    expect(read('THEMES.md')).not.toContain('run: npm run themes:build');
  });
});
