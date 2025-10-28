import type { APIRoute } from "astro";
import { readSettings } from "@/utils/settings";


const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" } as const;

export const POST: APIRoute = async ({ request }) => {
  const settings = readSettings();
  const observability = settings.observability;

  if (!observability?.enabled) {
    return new Response(
      JSON.stringify({ ok: false, error: "Observability disabled" }),
      {
        status: 403,
        headers: JSON_HEADERS,
      },
    );
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch (error) {
    console.error("[client-error] failed to read body", error);
  }

  const size = rawBody.length;
  let parsed: unknown = null;
  if (rawBody) {
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = { raw: rawBody.slice(0, 10_000) };
    }
  }

  console.error("[client-error]", {
    size,
    route: settings.clientErrorEndpoint ?? "/api/log",
    userAgent: request.headers.get("user-agent") ?? null,
    payload: parsed,
    receivedAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
