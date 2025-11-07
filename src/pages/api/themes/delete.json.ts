import { deleteThemeRecord } from '../../../../dev-api.js';
import { json, parseJsonBody, requireAdminAuth } from './_shared';

export const prerender = false;

export async function POST({ request }: { request: Request }) {
  const authFailure = requireAdminAuth(request);
  if (authFailure) {
    return authFailure;
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const data = await deleteThemeRecord(parsed.body || {});
    return json({ ok: true, ...data });
  } catch (error: any) {
    return json({ ok: false, error: error?.message || 'Failed to delete theme' }, 400);
  }
}
