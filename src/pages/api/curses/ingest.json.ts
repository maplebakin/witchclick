
import { persistPreparedCurse, prepareCurseForPersistence } from '../../../../server/lib/cursePreparation.js';
import { json, jsonError, requireMutatingAccess } from '../_mutating';

export async function POST({ request }: { request: Request }) {
  const denied = requireMutatingAccess(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({} as any));
    const dryRun = body?.dryRun === true || body?.dryRun === 'true';
    const prepared = prepareCurseForPersistence(body?.spec ?? body, {});

    if (!dryRun) {
      await persistPreparedCurse(prepared);
    }

    return json({
      ok: true,
      spec: prepared.spec,
      warnings: prepared.warnings,
      slug: prepared.spec.slug,
      path: prepared.markdown.filePath,
      saved: !dryRun,
    });
  } catch (e: any) {
    const details = Array.isArray(e?.errors) ? e.errors : undefined;
    return jsonError(
      Array.isArray(e?.errors) ? 400 : 500,
      Array.isArray(e?.errors) ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      e?.message || String(e),
      details,
    );
  }
}
