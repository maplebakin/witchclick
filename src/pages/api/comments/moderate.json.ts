export const prerender = false;

import { listComments, setCommentStatus } from "../../../server/lib/commentsStore.js";

function toJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function getSecret() {
  return import.meta.env.MODERATION_SECRET || process.env.MODERATION_SECRET;
}

function isAuthorized(request: Request): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const header = request.headers.get("x-moderation-key") || request.headers.get("authorization") || "";
  if (!header) return false;
  const cleaned = header.replace(/bearer\s+/i, "");
  return cleaned === secret;
}

export async function POST({ request }: { request: Request }) {
  const secret = getSecret();
  if (!secret) {
    return toJson({ ok: false, error: "Moderation secret is not configured." }, { status: 501 });
  }

  if (!isAuthorized(request)) {
    return toJson({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const slug = body?.slug ?? "";
    const commentId = body?.id ?? body?.commentId;
    const status = body?.status ?? "approved";

    if (!slug || !commentId) {
      return toJson({ ok: false, error: "Missing slug or comment id" }, { status: 400 });
    }

    const updated = await setCommentStatus(slug, commentId, status);
    if (!updated) {
      return toJson({ ok: false, error: "Comment not found" }, { status: 404 });
    }

    const comments = await listComments(slug, { includePending: true });
    return toJson({ ok: true, comment: updated, comments });
  } catch (error: any) {
    return toJson({ ok: false, error: error?.message || "Unable to update comment" }, { status: 500 });
  }
}
