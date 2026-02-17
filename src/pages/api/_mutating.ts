import { isValidSlug } from "../../../shared/slugify.js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

const AUTH_HEADER = "authorization";
const SECRET_HEADER = "x-witchclick-admin-secret";
const AUTH_REALM = "witchclick-admin";

const DEV_ONLY_MESSAGE = "Not found";

function isDevelopmentSession() {
  if (process.env.NODE_ENV === "production") return false;
  if (import.meta.env.DEV) return true;
  if (process.env.VITEST === "true") return true;
  return false;
}

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

export function jsonError(
  status: number,
  code: string,
  error: string,
  details?: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return json(
    {
      ok: false,
      code,
      error,
      ...(details !== undefined ? { details } : {}),
    },
    status,
    extraHeaders,
  );
}

export function methodNotAllowed(allow: string) {
  return jsonError(
    405,
    "METHOD_NOT_ALLOWED",
    `Method not allowed. Use ${allow}.`,
    undefined,
    { Allow: allow },
  );
}

export function ensureDevOnly(): Response | null {
  if (isDevelopmentSession()) return null;
  return jsonError(404, "NOT_FOUND", DEV_ONLY_MESSAGE);
}

export function getAdminApiToken(): string {
  return (
    process.env.ADMIN_API_TOKEN ||
    process.env.THEME_ADMIN_TOKEN ||
    process.env.DEV_API_TOKEN ||
    ""
  );
}

export function requireAdminAuth(request: Request): Response | null {
  const token = getAdminApiToken();
  if (!token) {
    return jsonError(500, "SERVER_MISCONFIG", "Admin API token not configured");
  }

  const secretHeader = request.headers.get(SECRET_HEADER);
  if (secretHeader && secretHeader === token) {
    return null;
  }

  const authHeader = request.headers.get(AUTH_HEADER) || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const providedToken = match?.[1]?.trim() ?? "";
  if (providedToken === token) {
    return null;
  }

  return jsonError(
    401,
    "UNAUTHORIZED",
    "Unauthorized",
    undefined,
    { "WWW-Authenticate": `Bearer realm="${AUTH_REALM}"` },
  );
}

export async function parseJsonBody(request: Request): Promise<{ ok: true; body: any } | { ok: false; response: Response }> {
  const raw = await request.text();
  if (!raw || !raw.trim()) {
    return { ok: true, body: {} };
  }
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, response: jsonError(400, "INVALID_JSON", "Invalid JSON body") };
  }
}

export function readValidatedSlug(
  body: Record<string, unknown>,
  field = "slug",
): { ok: true; slug: string } | { ok: false; response: Response } {
  const raw = body[field];
  if (typeof raw !== "string") {
    return {
      ok: false,
      response: jsonError(400, "INVALID_SLUG", `Missing or invalid ${field}`),
    };
  }

  const slug = raw.trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return {
      ok: false,
      response: jsonError(400, "INVALID_SLUG", `Invalid ${field}: expected a URL-safe slug`),
    };
  }

  return { ok: true, slug };
}

export function requireMutatingAccess(request: Request): Response | null {
  const devOnly = ensureDevOnly();
  if (devOnly) return devOnly;
  return requireAdminAuth(request);
}

export type MutatingAccessPolicy = "mutating" | "dev-only" | "auth-only" | "public";

export function enforceMutatingAccess(
  request: Request,
  policy: MutatingAccessPolicy = "mutating",
): Response | null {
  if (policy === "public") {
    return null;
  }
  if (policy === "dev-only") {
    return ensureDevOnly();
  }
  if (policy === "auth-only") {
    return requireAdminAuth(request);
  }
  return requireMutatingAccess(request);
}
