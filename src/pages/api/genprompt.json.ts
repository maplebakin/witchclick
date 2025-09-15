// src/pages/api/genprompt.json.ts
export const prerender = false;

// 👇 pin to the source file with extension
import { genprompt } from '../../../tools/src/genprompt';;

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const topic = String(body.topic ?? 'tea ritual for focus').trim();

    const wordsRaw = Number(body.words ?? 1200);
    const words = Number.isFinite(wordsRaw)
      ? Math.max(600, Math.min(4000, Math.round(wordsRaw)))
      : 1200;

    const ads: 'on' | 'off' = String(body.ads ?? 'off') === 'on' ? 'on' : 'off';
    const kofi: 'on' | 'off' = String(body.kofi ?? 'on') === 'on' ? 'on' : 'off';

    const { prompt } = genprompt({ topic, words, ads, kofi });

    // tiny runtime sanity check so this never silently regresses
    if (!prompt.includes('opening-reflection') || !prompt.includes('REQUIRED: The first outline item')) {
      throw new Error('Stale prompt detected (missing Opening Reflection guards). Check imports/caches.');
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
