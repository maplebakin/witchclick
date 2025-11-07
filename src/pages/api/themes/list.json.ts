import { listThemes } from '../../../../dev-api.js';
import { json } from './_shared';

export const prerender = false;

export async function POST() {
  try {
    const data = await listThemes();
    return json({ ok: true, ...data });
  } catch (error: any) {
    return json({ ok: false, error: error?.message || 'Failed to list themes' }, 500);
  }
}
