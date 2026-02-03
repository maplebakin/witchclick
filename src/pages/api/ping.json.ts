// src/pages/api/ping.json.ts

const MAX_BYTES = 1_000_000; // ~1MB; tweak as you like

export async function ALL({ request }: { request: Request }) {
  const method = request.method.toUpperCase();

  // Basic CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders({
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }),
    });
  }

  if (method !== 'POST') {
    return json(
      { ok: false, error: 'Method not allowed' },
      405,
      { Allow: 'POST, OPTIONS' }
    );
  }

  // Soft size guard (best-effort using Content-Length)
  const cl = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(cl) && cl > MAX_BYTES) {
    return json({ ok: false, error: 'Payload too large' }, 413, {});
  }

  let mode: 'json' | 'form' | 'text' = 'text';
  let parsed: any = null;
  let raw: string | null = null;

  try {
    const ct = (request.headers.get('content-type') || '').toLowerCase();

    if (ct.includes('application/json')) {
      // Prefer json(); on parse error, fall back to text
      try {
        parsed = await request.json();
        raw = safeStringify(parsed);
        mode = 'json';
      } catch {
        raw = await request.text();
        mode = 'text';
      }
    } else if (ct.includes('multipart/form-data')) {
      const fd = await request.formData();
      parsed = formDataToObject(fd);
      raw = safeStringify(parsed);
      mode = 'form';
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const txt = await request.text();
      const params = new URLSearchParams(txt);
      parsed = Object.fromEntries(params.entries());
      raw = safeStringify(parsed);
      mode = 'form';
    } else {
      raw = await request.text();
      mode = 'text';
    }

    // Compute byte size if we didn’t get Content-Length
    const bytes =
      cl > 0 ? cl : raw != null ? new TextEncoder().encode(raw).length : undefined;

    return json(
      {
        ok: true,
        mode,
        got: raw != null ? truncate(raw, 2000) : null,
        data: parsed ?? null,
        ct: request.headers.get('content-type') || null,
        bytes: typeof bytes === 'number' ? bytes : null,
      },
      200,
      {}
    );
  } catch (e: any) {
    return json(
      { ok: false, error: e?.message || String(e) },
      500,
      {}
    );
  }
}

/* ---------------- helpers ---------------- */

function corsHeaders(extra: Record<string, string> = {}) {
  // For dev tools, a permissive policy is fine; scope it if you deploy this public.
  return {
    'Access-Control-Allow-Origin': '*',
    'Vary': 'Origin',
    ...extra,
  };
}

function json(
  obj: any,
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(extraHeaders),
    },
  });
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v);
  } catch {
    // circular or non-serializable entries → coarse fallback
    return String(v);
  }
}

function formDataToObject(fd: FormData) {
  const obj: Record<string, any> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') {
      obj[k] = v;
    } else {
      // File/Blob: don’t stream the body; just describe it
      obj[k] = {
        _file: true,
        name: (v as File).name,
        size: (v as File).size,
        type: (v as File).type,
      };
    }
  }
  return obj;
}
