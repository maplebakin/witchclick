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

  const { saveThemeRecord } = await loadThemeAdminModule();

  try {
    const theme = await saveThemeRecord(parsed.body || {});
    return json({ ok: true, theme });
  } catch (error: unknown) {
    return json({ ok: false, error: toErrorMessage(error, 'Failed to save theme') }, 400);
  }
}
