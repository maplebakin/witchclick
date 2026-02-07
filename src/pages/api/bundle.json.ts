
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { json, jsonError, requireMutatingAccess } from './_mutating';

const pExecFile = promisify(execFile);

async function run(cmd: string, args: string[]) {
  try {
    const { stdout, stderr } = await pExecFile(cmd, args, { timeout: 10 * 60_000, maxBuffer: 10 * 1024 * 1024 });
    return { ok: true, cmd: [cmd, ...args].join(' '), stdout, stderr };
  } catch (e: any) {
    return { ok: false, cmd: [cmd, ...args].join(' '), stdout: e?.stdout || '', stderr: e?.stderr || String(e) };
  }
}

export async function POST({ request }: { request: Request }) {
  const denied = requireMutatingAccess(request);
  if (denied) return denied;

  try {
    const steps: any[] = [];

    // 1) Internal-link pass (real linker; see step 2)
    steps.push(await run('node', ['tools/wc.js', 'linker']));

    // 2) Affiliate redirects (/go/<key>) from products.json
    steps.push(await run('node', ['tools/wc.js', 'go:build']));

    // 3) Optional: lightweight build to verify nothing’s broken (comment out if you don’t want it during dev)
    // steps.push(await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']));

    const ok = steps.every((step) => step.ok);
    return json({ ok, steps }, ok ? 200 : 500);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'INTERNAL_ERROR', message);
  }
}
