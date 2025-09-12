// src/pages/api/ping.json.ts
export const prerender = false;

export async function POST({ request }: { request: Request }) {
  let bodyStr: string | null = null;
  let parseMode = 'none';

  // Try JSON first (some setups only allow .json())
  try {
    const obj = await request.json();
    bodyStr = JSON.stringify(obj);
    parseMode = 'json';
  } catch {}

  // Fallback to text()
  if (!bodyStr) {
    try {
      const txt = await request.text();
      if (txt && txt.trim()) {
        bodyStr = txt;
        parseMode = 'text';
      }
    } catch {}
  }

  // Last resort: multipart/form-data
  if (!bodyStr) {
    try {
      const form = await request.formData();
      const raw = (form.get('json') || form.get('body') || '') as string;
      if (typeof raw === 'string' && raw.trim()) {
        bodyStr = raw;
        parseMode = 'form';
      }
    } catch {}
  }

  return new Response(JSON.stringify({
    ok: true,
    mode: parseMode,
    got: bodyStr ?? null,
    ct: request.headers.get('content-type') || null
  }), { headers: { 'Content-Type': 'application/json' }});
}
