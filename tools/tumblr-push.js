import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';

const TUMBLR_HOST = 'api.tumblr.com';
const TUMBLR_PATH = '/v2/blog/streamthread/posts';
const TUMBLR_URL = `https://${TUMBLR_HOST}${TUMBLR_PATH}`;

const REQUIRED_ENV_KEYS = [
  'TUMBLR_CONSUMER_KEY',
  'TUMBLR_CONSUMER_SECRET',
  'TUMBLR_TOKEN',
  'TUMBLR_TOKEN_SECRET',
];

const APPENDED_TAGS = [
  'witchblr',
  'witchcraft',
  'witch',
  'paganism',
  'occult',
  'metaphysical',
  'witchcore',
  'secular witch',
  'cozy witch',
];

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseEnvCredentials() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Tumblr credentials missing: ${missing.join(', ')}`);
  }

  return {
    consumerKey: String(process.env.TUMBLR_CONSUMER_KEY).trim(),
    consumerSecret: String(process.env.TUMBLR_CONSUMER_SECRET).trim(),
    token: String(process.env.TUMBLR_TOKEN).trim(),
    tokenSecret: String(process.env.TUMBLR_TOKEN_SECRET).trim(),
  };
}

function normalizeTags(tags) {
  const merged = [...(Array.isArray(tags) ? tags : []), ...APPENDED_TAGS];
  const seen = new Set();
  const deduped = [];
  for (const tag of merged) {
    const value = String(tag || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
}

function makeNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizeParamTuples(params) {
  return params
    .map(([key, value]) => [percentEncode(key), percentEncode(value)])
    .sort((a, b) => {
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });
}

function buildSignature({
  method,
  url,
  oauthParams,
  bodyParams,
  consumerSecret,
  tokenSecret,
}) {
  const tuples = [
    ...Object.entries(oauthParams),
    ...Object.entries(bodyParams),
  ];
  const normalized = normalizeParamTuples(tuples)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(normalized),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function buildAuthorizationHeader(oauthParams) {
  const serialized = normalizeParamTuples(Object.entries(oauthParams))
    .map(([key, value]) => `${key}="${value}"`)
    .join(', ');
  return `OAuth ${serialized}`;
}

function buildFormBody(bodyParams) {
  return Object.entries(bodyParams)
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');
}

function requestTumblr({ authorization, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: TUMBLR_HOST,
        path: TUMBLR_PATH,
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          resolve({
            statusCode: Number(res.statusCode || 0),
            body: responseBody,
          });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractPostUrl(parsed) {
  const response = parsed && typeof parsed === 'object' ? parsed.response || {} : {};
  const fromKnownField = [
    response.post_url,
    response.url,
    response.short_url,
    response?.post?.post_url,
    response?.post?.url,
  ].find((value) => typeof value === 'string' && value.trim());

  if (fromKnownField) return String(fromKnownField).trim();

  const id = response.id_string || response.id;
  if (id) {
    return `https://streamthread.tumblr.com/post/${encodeURIComponent(String(id))}`;
  }

  return '';
}

function validatePostData(postData) {
  const data = postData && typeof postData === 'object' ? postData : {};
  const title = String(data.title || '').trim();
  const excerpt = String(data.excerpt || '').trim();
  const url = String(data.url || '').trim();
  const heroImage = String(data.heroImage || '').trim();
  const tags = Array.isArray(data.tags) ? data.tags : [];

  if (!title) throw new Error('Tumblr push requires a non-empty title.');
  if (!excerpt) throw new Error('Tumblr push requires a non-empty excerpt.');
  if (!url) throw new Error('Tumblr push requires a non-empty url.');
  if (!heroImage) throw new Error('Tumblr push requires a non-empty heroImage path.');
  if (!fs.existsSync(heroImage)) throw new Error(`Tumblr hero image file not found: ${heroImage}`);

  return { title, excerpt, url, heroImage, tags };
}

export async function pushToTumblr(postData) {
  const { consumerKey, consumerSecret, token, tokenSecret } = parseEnvCredentials();
  const { title, excerpt, url, heroImage, tags } = validatePostData(postData);

  const heroBuffer = await fs.promises.readFile(heroImage);
  if (!heroBuffer.length) {
    throw new Error(`Tumblr hero image was empty: ${heroImage}`);
  }

  const caption = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(excerpt)}</p><p><a href="${escapeHtml(url)}">Read on WitchClick →</a></p>`;
  const mergedTags = normalizeTags(tags);

  const bodyParams = {
    type: 'photo',
    caption,
    tags: mergedTags.join(','),
    data64: heroBuffer.toString('base64'),
  };

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: makeNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0',
  };

  const signature = buildSignature({
    method: 'POST',
    url: TUMBLR_URL,
    oauthParams,
    bodyParams,
    consumerSecret,
    tokenSecret,
  });
  oauthParams.oauth_signature = signature;

  const authorization = buildAuthorizationHeader(oauthParams);
  const requestBody = buildFormBody(bodyParams);
  const response = await requestTumblr({ authorization, body: requestBody });

  let parsed = null;
  try {
    parsed = JSON.parse(response.body || '{}');
  } catch {
    parsed = null;
  }

  const metaStatus = Number(parsed?.meta?.status || 0);
  const isFailureStatus = response.statusCode < 200 || response.statusCode >= 300;
  const isFailureMeta = Number.isFinite(metaStatus) && metaStatus >= 400;
  if (isFailureStatus || isFailureMeta) {
    throw new Error(
      `Tumblr API request failed (${response.statusCode || metaStatus || 'unknown'}): ${response.body || 'No response body'}`,
    );
  }

  const postUrl = extractPostUrl(parsed);
  if (!postUrl) {
    throw new Error(`Tumblr API did not return a post URL. Response: ${response.body || 'No response body'}`);
  }

  return { success: true, postUrl };
}

export default { pushToTumblr };
