
import { persistPreparedCurse, prepareCurseForPersistence } from '../../../../server/lib/cursePreparation.js';

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const dryRun = body?.dryRun === true || body?.dryRun === 'true';
    const prepared = prepareCurseForPersistence(body?.spec ?? body, {});

    if (!dryRun) {
      await persistPreparedCurse(prepared);
    }

    return new Response(JSON.stringify({
      ok: true,
      spec: prepared.spec,
      warnings: prepared.warnings,
      slug: prepared.spec.slug,
      path: prepared.markdown.filePath,
      saved: !dryRun,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({
      ok: false,
      error: e?.message || String(e),
      errors: Array.isArray(e?.errors) ? e.errors : undefined,
    }), {
      status: Array.isArray(e?.errors) ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
