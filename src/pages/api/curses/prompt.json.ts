export const prerender = false;

import { gencurse } from '../../../../tools/src/gencurse';;
import { CURSE_TARGETS, CURSE_TONES, CURSE_TYPES } from '../../../../server/lib/curseSpecSchema.js';

function fallback<T extends string>(value: string | undefined, allowed: readonly T[], defaultValue: T): T {
  if (!value) return defaultValue;
  const match = allowed.find((item) => item === value);
  return match ?? defaultValue;
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const type = fallback(String(body.type ?? 'mirror'), CURSE_TYPES, 'mirror');
    const target = fallback(String(body.target ?? 'person'), CURSE_TARGETS, 'person');
    const tone = fallback(String(body.tone ?? 'poetic'), CURSE_TONES, 'poetic');
    const sigilName = typeof body.sigilName === 'string' ? body.sigilName : undefined;
    const altarItem = typeof body.altarItem === 'string' ? body.altarItem : undefined;
    const journalingFollowUp = typeof body.journalingFollowUp === 'string'
      ? body.journalingFollowUp
      : undefined;

    const { prompt } = gencurse({
      type,
      target,
      tone,
      sigilName,
      altarItem,
      journalingFollowUp,
    });

    if (!prompt.includes('WHITE MAGIC CURSE GENERATOR') || !prompt.includes('CurseSpec v1')) {
      throw new Error('Stale curse prompt detected.');
    }

    return new Response(JSON.stringify({ ok: true, prompt }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
