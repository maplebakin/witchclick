const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const;

const DEV_ONLY_STATUS = 404;
const DEV_ONLY_MESSAGE =
  'Theme admin API endpoints are only available during local development sessions.';

export function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

export function ensureDevOnly(): Response | null {
  if (import.meta.env.DEV) {
    return null;
  }
  return json({ ok: false, error: DEV_ONLY_MESSAGE }, DEV_ONLY_STATUS);
}

type ThemeAdminModule = typeof import('../../../../dev-api.js');

let cachedDevModule: Promise<ThemeAdminModule> | null = null;

export async function loadThemeAdminModule(): Promise<ThemeAdminModule> {
  if (!import.meta.env.DEV) {
    throw new Error('Theme admin module should never load outside development.');
  }

  if (!cachedDevModule) {
    cachedDevModule = import('../../../../dev-api.js');
  }

  return cachedDevModule;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

type ParsedBodyResult =
  | { ok: true; body: any }
  | { ok: false; response: Response };

export async function parseJsonBody(request: Request): Promise<ParsedBodyResult> {
  const raw = await request.text();
  if (!raw || !raw.trim()) {
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, response: json({ ok: false, error: 'Invalid JSON body' }, 400) };
  }
}

const AUTH_HEADER = 'authorization';
const SECRET_HEADER = 'x-witchclick-admin-secret';
const AUTH_REALM = 'witchclick-admin';

export function requireAdminAuth(request: Request): Response | null {
  const token = process.env.THEME_ADMIN_TOKEN;

  if (!token) {
    return json({ ok: false, error: 'Theme admin token not configured' }, 500);
  }

  const secretHeader = request.headers.get(SECRET_HEADER);
  if (secretHeader && secretHeader === token) {
    return null;
  }

  const authHeader = request.headers.get(AUTH_HEADER) || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedToken = match ? match[1].trim() : '';

  if (providedToken === token) {
    return null;
  }

  return json(
    { ok: false, error: 'Unauthorized' },
    401,
    { 'WWW-Authenticate': `Bearer realm="${AUTH_REALM}"` },
  );
}
