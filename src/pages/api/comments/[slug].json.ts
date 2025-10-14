export const prerender = false;

import { addComment, listComments } from "../../../../server/lib/commentsStore.js";

function toJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function GET({ params, request }: { params: Record<string, string>; request: Request }) {
  try {
    const slug = params?.slug ?? "";
    const secret = import.meta.env.MODERATION_SECRET || process.env.MODERATION_SECRET;
    const providedKey = request.headers.get("x-moderation-key") || request.headers.get("authorization");
    const includePending = Boolean(secret && providedKey && providedKey.replace(/bearer\s+/i, "") === secret);
    const comments = await listComments(slug, { includePending });
    const pendingCount = includePending
      ? comments.filter((comment: any) => comment.status === "pending").length
      : undefined;

    return toJson({ ok: true, comments, pendingCount });
  } catch (error: any) {
    return toJson({ ok: false, error: error?.message || "Unable to load comments" }, { status: 500 });
  }
}

export async function POST({ params, request }: { params: Record<string, string>; request: Request }) {
  try {
    const slug = params?.slug ?? "";
    const body = await request.json().catch(() => ({}));
    const comment = await addComment(slug, body);
    return toJson({ ok: true, comment }, { status: 201 });
  } catch (error: any) {
    const message = error?.message || "Unable to save comment";
    const status = /name|message|slug/i.test(message) ? 400 : 500;
    return toJson({ ok: false, error: message }, { status });
  }
}
