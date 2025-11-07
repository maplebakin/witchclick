import { ensureDevOnly, json, loadThemeAdminModule, toErrorMessage } from './_shared';

export async function POST() {
  const devOnlyResponse = ensureDevOnly();
  if (devOnlyResponse) {
    return devOnlyResponse;
  }

  const { listThemes } = await loadThemeAdminModule();

  try {
    const data = await listThemes();
    return json({ ok: true, ...data });
  } catch (error: unknown) {
    return json({ ok: false, error: toErrorMessage(error, 'Failed to list themes') }, 500);
  }
}
