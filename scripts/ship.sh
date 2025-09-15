#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-publish: content update}"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"

echo "▶ Checking & building..."
npm run check > /dev/null

echo "▶ Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "✓ Nothing to commit. You're up to date."
  exit 0
fi

echo "▶ Committing..."
git commit -m "$MSG"

echo "▶ Pushing to $BRANCH..."
git push -u origin "$BRANCH"

echo "✓ Shipped!"
