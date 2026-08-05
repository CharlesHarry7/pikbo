#!/usr/bin/env bash
# Agent-facing Vercel deploy budget gate (HARD).
#
# Prefer host tool ~/.local/bin/vercel-budget when present; otherwise use the
# same counter file and rules so Multica agents never skip the gate.
#
# Counter: ~/.multica/mission/vercel-deploy-count.day  (YYYY-MM-DD count)
# Policy:  ~/.multica/mission/SHIP_AND_DEPLOY.md
# Max:     VERCEL_DAILY_MAX (default 8 usable / UTC day)
#
# Usage:
#   bash scripts/vercel-budget-gate.sh check   # exit 0 ok, 1 blocked
#   bash scripts/vercel-budget-gate.sh status
#   bash scripts/vercel-budget-gate.sh add     # after a successful deploy only
set -euo pipefail

cmd="${1:-check}"
MAX="${VERCEL_DAILY_MAX:-8}"
F="${HOME}/.multica/mission/vercel-deploy-count.day"
DAY=$(date -u +%Y-%m-%d)

# Prefer the host mission tool when installed.
if command -v vercel-budget >/dev/null 2>&1; then
  exec vercel-budget "$cmd"
fi

mkdir -p "$(dirname "$F")"
if [ ! -f "$F" ]; then
  echo "$DAY 0" > "$F"
fi
read -r fday cnt < "$F" || true
if [ "${fday:-}" != "$DAY" ]; then
  cnt=0
  echo "$DAY 0" > "$F"
fi
cnt=${cnt:-0}

case "$cmd" in
  check)
    echo "vercel-budget day=$DAY used=$cnt max=$MAX (in-repo gate)"
    if [ "$cnt" -ge "$MAX" ]; then
      echo "BLOCKED: deploy budget exhausted — open PR only; do not run vercel CLI"
      exit 1
    fi
    exit 0
    ;;
  status)
    rem=$((MAX - cnt))
    echo "day=$DAY used=$cnt max=$MAX remaining=$rem"
    ;;
  add)
    cnt=$((cnt + 1))
    echo "$DAY $cnt" > "$F"
    echo "vercel-budget now $cnt/$MAX"
    ;;
  *)
    echo "usage: vercel-budget-gate.sh {check|add|status}"
    exit 2
    ;;
esac
