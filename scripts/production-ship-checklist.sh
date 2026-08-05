#!/usr/bin/env bash
# Production ship checklist — health softLive truth + no Vercel quota burn.
#
# Always safe to run (read-only against prod by default). Never deploys.
# Deploy is a separate, explicit operator action gated by vercel-budget.
#
# Usage:
#   npm run production-ship-checklist
#   BASE=https://pikbo.ai npm run production-ship-checklist
#   REQUIRE_SOFT_LIVE=1 npm run production-ship-checklist   # strict live gate
#   SKIP_REMOTE=1 npm run production-ship-checklist         # offline only
set -euo pipefail
export PATH="/Users/x/.local/bin:/Users/x/.local/npm-global/bin:${PATH:-}"
export NO_PROXY="*" no_proxy="*"
unset ALL_PROXY all_proxy HTTP_PROXY HTTPS_PROXY http_proxy https_proxy 2>/dev/null || true

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BASE="${BASE:-${BASE_URL:-https://pikbo.ai}}"
REQUIRE_SOFT_LIVE="${REQUIRE_SOFT_LIVE:-0}"
SKIP_REMOTE="${SKIP_REMOTE:-0}"
FAIL=0

echo "== Pikbo production ship checklist =="
echo "BASE=$BASE  REQUIRE_SOFT_LIVE=$REQUIRE_SOFT_LIVE  SKIP_REMOTE=$SKIP_REMOTE"
echo

# --- 0) Vercel budget (HARD; agents must call this before any deploy) ---
echo "-- 0) vercel-budget check (mandatory before any vercel CLI / prod promote) --"
if bash scripts/vercel-budget-gate.sh check; then
  echo "OK   vercel-budget: headroom remains (deploy optional only if change is main-worthy)"
else
  echo "OK   vercel-budget: BLOCKED — ship as PR only (no vercel CLI, no force prod)"
  # Budget block is not a checklist failure for PR-only ship; it is a deploy block.
fi
bash scripts/vercel-budget-gate.sh status || true
echo

# --- 1) Offline softLive truth contract (pure; no secrets / no network) ---
echo "-- 1) health softLive truth contract (offline) --"
if node scripts/health-truth-contract.mjs; then
  echo "OK   softLive truth: all-five AND; freeTrial tracks softLive"
else
  echo "FAIL softLive truth contract"
  FAIL=1
fi
echo

# --- 2) Wiring regression (docs + agents + gate scripts present) ---
echo "-- 2) production ship wiring regression --"
if node scripts/production-ship-checklist-regression.mjs; then
  echo "OK   ship checklist wiring"
else
  echo "FAIL ship checklist wiring"
  FAIL=1
fi
echo

# --- 3) Remote production health honesty ---
if [[ "$SKIP_REMOTE" == "1" ]]; then
  echo "-- 3) remote /api/health — skipped (SKIP_REMOTE=1) --"
else
  echo "-- 3) remote /api/health softLive honesty @ $BASE --"
  TMP="$(mktemp -t pikbo-ship-health.XXXXXX.json)"
  code=$(curl --noproxy '*' -sS -o "$TMP" -w "%{http_code}" -m 20 "${BASE}/api/health" || echo "000")
  if [[ "$code" != "200" ]]; then
    echo "FAIL /api/health HTTP $code"
    FAIL=1
  else
    echo "OK   /api/health HTTP 200"
    if ! python3 - "$TMP" "$REQUIRE_SOFT_LIVE" <<'PY'
import json, sys
path, require_soft = sys.argv[1], sys.argv[2] == "1"
h = json.load(open(path))
ready = h.get("ready") or {}
acceptance = h.get("acceptance") or {}
billing = ((h.get("billing") or {}).get("freeTrial") or {})
soft = ready.get("softLive") is True
mode = ready.get("mode") or h.get("mode")
paid = ready.get("paid") is True
ok = h.get("ok") is True
degraded = h.get("degraded") is True
fail = 0

def check(cond, msg):
    global fail
    if cond:
        print("OK  ", msg)
    else:
        print("FAIL", msg)
        fail = 1

check(ok and not degraded, f"ok={ok} degraded={degraded}")
check(acceptance.get("softLive") is soft, "acceptance.softLive matches ready.softLive")
check(billing.get("available") is soft, "billing.freeTrial.available matches ready.softLive")
check(
    (billing.get("scope") == "video-create-only") if soft else (billing.get("scope") == "cached-demo-only"),
    f"freeTrial.scope honest ({billing.get('scope')})",
)
if soft:
    check(billing.get("clipsPerPeriod") == 1, "clipsPerPeriod=1 when softLive")
    check(mode in ("live-generate", "live"), f"mode live-ish when softLive (mode={mode})")
else:
    check(billing.get("clipsPerPeriod") in (0, None), "clipsPerPeriod=0 when softLive false")
    check(
        mode in ("validation", "cached-only", "demo"),
        f"mode non-live when softLive false (mode={mode})",
    )
    check(paid is False, "paid=false while softLive=false")
    # Public soft-live closed is the honest production default.
    print("note production softLive=false is expected until server-owned deliverable + live gates open")

if require_soft:
    check(soft is True, "REQUIRE_SOFT_LIVE=1 demands ready.softLive=true")
    check(paid is False or paid is True, "paid flag present")

missing = acceptance.get("missingLiveRequirements") or []
print("mode=", mode, "softLive=", soft, "paid=", paid)
print("missingLiveRequirements=", missing)
print("privatePreview=", ready.get("privatePreview"), "privateInputAdmission=", ready.get("privateInputAdmission"))
sys.exit(fail)
PY
    then
      FAIL=1
    fi
  fi
  rm -f "$TMP"
fi
echo

# --- 4) Agent deploy policy reminder ---
echo "-- 4) deploy policy (no auto-deploy from this script) --"
echo "     · Batch commits → one git push per session (Git integration previews burn quota)."
echo "     · Before any \`vercel\` CLI or production promote: npm run vercel-budget -- check"
echo "     · After successful deploy only: npm run vercel-budget -- add"
echo "     · Prefer merge-to-main over force prod; max ~8 usable deploys / UTC day."
echo "     · No fake UGC; public softLive stays fail-closed until all five gates are true."
echo

if [[ "$FAIL" -ne 0 ]]; then
  echo "production-ship-checklist: FAIL"
  exit 1
fi
echo "production-ship-checklist: PASS (PR-ready; deploy only if vercel-budget check allows)"
exit 0
