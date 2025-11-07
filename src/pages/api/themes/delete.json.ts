import {
  ensureDevOnly,
  json,
  loadThemeAdminModule,
  parseJsonBody,
  requireAdminAuth,
  toErrorMessage,
} from './_shared';

export async function POST({ request }: { request: Request }) {
  const devOnlyResponse = ensureDevOnly();
  if (devOnlyResponse) {
    return devOnlyResponse;
  }

  const authFailure = requireAdminAuth(request);
  if (authFailure) {
    return authFailure;
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { deleteThemeRecord } = await loadThemeAdminModule();

  try {
    const data = await deleteThemeRecord(parsed.body || {});
    return json({ ok: true, ...data });
  } catch (error: unknown) {
    return json({ ok: false, error: toErrorMessage(error, 'Failed to delete theme') }, 400);
  }
}
