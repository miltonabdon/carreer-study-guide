#!/usr/bin/env bash
# ship.sh — build, commit, push, wait for Vercel deploy
# Usage: bash .claude/scripts/ship.sh "commit message"

set -e

MSG="${1:-chore: update}"
REPO="miltonabdon/carreer-study-guide"

echo "==> Build check..."
if ! npx next build 2>&1; then
  echo "❌ Build failed. Aborting."
  exit 1
fi
echo "✅ Build OK"

echo "==> Staging and committing..."
git add -A
if git diff --cached --quiet; then
  echo "⚠️  Nothing to commit."
else
  git commit -m "$MSG

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
  echo "✅ Committed"
fi

echo "==> Pushing..."
git push origin main
PUSH_SHA=$(git rev-parse HEAD | cut -c1-7)
echo "✅ Pushed $PUSH_SHA"

echo "==> Waiting for Vercel deploy..."
TIMEOUT=300
ELAPSED=0
PREV_STATE=""

while [ $ELAPSED -lt $TIMEOUT ]; do
  DEPLOY_ID=$(gh api "repos/$REPO/deployments" --jq '.[0].id' 2>/dev/null)
  if [ -n "$DEPLOY_ID" ]; then
    STATE=$(gh api "repos/$REPO/deployments/$DEPLOY_ID/statuses" --jq '.[0].state' 2>/dev/null)
    if [ "$STATE" != "$PREV_STATE" ] && [ -n "$STATE" ]; then
      echo "  deploy $DEPLOY_ID: $STATE"
      PREV_STATE="$STATE"
    fi
    if [ "$STATE" = "success" ]; then
      echo "✅ Deploy SUCCESS — https://carreer-study-guide.vercel.app"
      exit 0
    fi
    if [ "$STATE" = "failure" ] || [ "$STATE" = "error" ]; then
      echo "❌ Deploy FAILED ($STATE)"
      echo "   Run: npx vercel inspect --logs"
      exit 1
    fi
  fi
  sleep 15
  ELAPSED=$((ELAPSED + 15))
done

echo "⚠️  Deploy timed out after ${TIMEOUT}s — check Vercel dashboard"
exit 1
