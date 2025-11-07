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

  const { setActiveThemeRecord } = await loadThemeAdminModule();

  try {
    const data = await setActiveThemeRecord(parsed.body || {});
    return json({ ok: true, ...data });
  } catch (error: unknown) {
    return json({ ok: false, error: toErrorMessage(error, 'Failed to update active theme') }, 400);
  }
}
