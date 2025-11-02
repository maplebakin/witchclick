export const prerender = true;

export function GET() {
  const isProd = import.meta.env.PROD;
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...(isProd ? ["Disallow: /admin"] : []),
    "Sitemap: https://witchclick.space/sitemap.xml",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
