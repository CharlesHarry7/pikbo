#!/usr/bin/env bash
# Local launch preflight — no Vercel / no boss login required.
set -euo pipefail
export PATH="/Users/x/.local/bin:/Users/x/.hermes/node/bin:$PATH"
export NO_PROXY="*" no_proxy="*"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== preflight-launch =="
echo "-- engine-smoke --"
npm run engine-smoke

echo "-- moment-create-href-smoke --"
npm run moment-create-href-smoke

echo "-- generate-360-cta-smoke --"
npm run generate-360-cta-smoke

echo "-- typecheck --"
npm run typecheck

echo "-- lint (app lib components) --"
npx eslint app lib components --max-warnings=0

echo "-- build --"
NEXT_TELEMETRY_DISABLED=1 npm run build

BASE="${BASE_URL:-http://127.0.0.1:3000}"
if curl -sf --max-time 3 "$BASE/api/health" >/dev/null 2>&1; then
  echo "-- health @ $BASE --"
  curl -s --max-time 5 "$BASE/api/health" | head -c 600
  echo
  echo "-- link-check --"
  BASE_URL="$BASE" npm run link-check
else
  echo "skip link-check (no server at $BASE) — start: npm run dev"
fi

echo "preflight-launch: PASS (build+smoke green)"
