import fs from "node:fs/promises";
import path from "node:path";

export const prerender = false;

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionFromType(type: string): string | null {
  switch (type) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/avif":
      return ".avif";
    default:
      return null;
  }
}

export async function POST({ request }: { request: Request }) {
  const isDev = import.meta.env.DEV;
  const ADMIN_KEY = import.meta.env.PUBLIC_ADMIN_KEY ?? "";
  const url = new URL(request.url);
  const providedKey =
    request.headers.get("x-admin-key") || url.searchParams.get("key") || "";

  if (!isDev) {
    if (!ADMIN_KEY) {
      return badRequest("Admin uploads are disabled (missing admin key)", 403);
    }
    if (providedKey !== ADMIN_KEY) {
      return badRequest("Invalid admin key", 403);
    }
  }

  const form = await request.formData();
  const slugRaw = String(form.get("slug") ?? "");
  const normalizedSlug = normalizeSlug(slugRaw);
  if (!normalizedSlug) {
    return badRequest("Missing slug");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return badRequest("Missing file");
  }

  const originalName = String(form.get("fileName") ?? file.name ?? "").trim();
  const providedExt = path.extname(originalName).toLowerCase();
  let extension = providedExt;
  if (!extension) {
    extension = extensionFromType(file.type ?? "") || "";
  }

  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"];
  if (!extension || !allowed.includes(extension)) {
    return badRequest("Unsupported file type. Use PNG, JPG, WEBP, GIF, or AVIF.");
  }

  const safeExt = extension === ".jpeg" ? ".jpg" : extension;
  const heroDir = path.join(process.cwd(), "public", "hero-images");
  await fs.mkdir(heroDir, { recursive: true });

  const targetName = `${normalizedSlug}${safeExt}`;
  const targetPath = path.join(heroDir, targetName);

  try {
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
  } catch (error: any) {
    return badRequest(error?.message || "Failed to save file", 500);
  }

  const heroPath = `hero-images/${targetName}`;
  const heroSrc = `/${heroPath}`;

  return new Response(
    JSON.stringify({ ok: true, heroPath, heroSrc, fileName: targetName }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
