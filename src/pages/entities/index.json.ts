import type { APIRoute } from "astro";
import { buildEntityIndex } from "../../utils/entities.js";

export const prerender = true;

export const GET: APIRoute = async () => {
  const payload = buildEntityIndex();
  const body = JSON.stringify(payload);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
};
