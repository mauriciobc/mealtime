#!/usr/bin/env bash
# Configure GitHub Actions secrets for E2E Staging from local env files.
# Usage: ./scripts/setup-e2e-github-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install: https://cli.github.com/"
  exit 1
fi

# shellcheck disable=SC1091
[[ -f .env.test.local ]] && source .env.test.local
# shellcheck disable=SC1091
[[ -f .env.local ]] && source .env.local

: "${TEST_USER_EMAIL:?Set TEST_USER_EMAIL in .env.test.local}"
: "${TEST_USER_PASSWORD:?Set TEST_USER_PASSWORD in .env.test.local}"

PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-https://mealtime.app.br}"
if [[ "$PLAYWRIGHT_BASE_URL" == *localhost* ]] || [[ "$PLAYWRIGHT_BASE_URL" == *127.0.0.1* ]]; then
  PLAYWRIGHT_BASE_URL="https://mealtime.app.br"
  echo "Using staging URL: $PLAYWRIGHT_BASE_URL (local URL is not suitable for CI staging)"
fi

gh secret set PLAYWRIGHT_BASE_URL --body "$PLAYWRIGHT_BASE_URL"
gh secret set TEST_USER_EMAIL --body "$TEST_USER_EMAIL"
gh secret set TEST_USER_PASSWORD --body "$TEST_USER_PASSWORD"

if [[ -n "${CRON_SECRET:-}" ]]; then
  gh secret set CRON_SECRET --body "$CRON_SECRET"
else
  echo "CRON_SECRET not set in .env.local — skipping (notifications-triggers E2E may fail)"
fi

echo "Done. Configured secrets:"
gh secret list
