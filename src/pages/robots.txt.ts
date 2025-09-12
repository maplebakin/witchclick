export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
