// One local API origin for npm run dev and direct Astro dev. Never contains credentials.
export function resolveLocalDevApi(env = {}) {
  const host = (env.DEV_API_HOST || '127.0.0.1').trim();
  const rawPort = String(env.DEV_API_PORT || '8787').trim();
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DEV_API_PORT must be an integer between 1 and 65535.');
  }
  const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'];
  const browserHost = host === '0.0.0.0' ? '127.0.0.1' : host.includes(':') ? `[${host.replace(/^\[|\]$/g, '')}]` : host;
  const fallback = `http://${browserHost}:${port}`;
  let url;
  try { url = new URL(env.PUBLIC_DEV_API || fallback); } catch {
    throw new Error('PUBLIC_DEV_API must be an absolute URL for the separate local dev-api.js server.');
  }
  const validHost = loopback.includes(host) ? loopback.includes(url.hostname) : url.hostname === browserHost || (host === '0.0.0.0' && loopback.includes(url.hostname));
  if (url.protocol !== 'http:' || Number(url.port || 80) !== port || !validHost || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error(`PUBLIC_DEV_API must point to the separate dev-api.js origin (${fallback}), not Astro or an /api path. Check DEV_API_HOST and DEV_API_PORT.`);
  }
  return { host, port: String(port), origin: url.origin };
}
