const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const;

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
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
