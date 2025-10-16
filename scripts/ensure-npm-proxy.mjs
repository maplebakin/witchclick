#!/usr/bin/env node
const legacyKeys = [
  'npm_config_http_proxy',
  'npm_config_http-proxy',
];

const httpsProxyCandidates = [
  process.env.npm_config_https_proxy,
  process.env.HTTPS_PROXY,
  process.env.https_proxy,
].filter(Boolean);

const found = legacyKeys.filter((key) => Boolean(process.env[key]));

if (found.length > 0) {
  const mismatched = httpsProxyCandidates.length === 0
    ? found
    : found.filter((key) => !httpsProxyCandidates.includes(process.env[key]));

  const guidance = [
    'Remove the deprecated npm proxy env vars before running build.',
    'Set HTTPS_PROXY / npm_config_https_proxy instead so npm does not warn.',
    `Legacy keys found: ${found.join(', ')}`,
  ];

  if (mismatched.length > 0) {
    console.error(`\n✖️  npm proxy configuration needs attention.\n${guidance.join('\n')}\n`);
    process.exit(1);
  } else {
    console.warn(`\n⚠️  npm proxy legacy variables mirror HTTPS proxy.`);
    console.warn('Consider removing the deprecated keys so npm stops warning.');
    console.warn(`Legacy keys found: ${found.join(', ')}`);
  }
}
