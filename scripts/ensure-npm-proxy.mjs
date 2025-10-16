#!/usr/bin/env node
const legacyKeys = [
  'npm_config_http_proxy',
  'npm_config_http-proxy'
];

const found = legacyKeys.filter((key) => Boolean(process.env[key]));

if (found.length > 0) {
  const guidance = [
    'Remove the deprecated npm proxy env vars before running build.',
    'Set HTTPS_PROXY / npm_config_https_proxy instead so npm does not warn.',
    `Legacy keys found: ${found.join(', ')}`,
  ];
  console.error(`\n✖️  npm proxy configuration needs attention.\n${guidance.join('\n')}\n`);
  process.exit(1);
}
