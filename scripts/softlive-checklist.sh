#!/usr/bin/env bash
# Soft-live env checklist (boss wake / ops). Presence only — never prints secret values.
# Soft launch (Sunday, no Stripe): only SESSION_SECRET + FAL_KEY are required.
set -euo pipefail
cd "$(dirname "$0")/.."

req_ok=0
req_bad=0
opt_ok=0
opt_miss=0

check_req() {
  local name="$1"
  local present="$2"
  if [[ "$present" == "1" ]]; then
    echo "OK   $name  (required for soft-live)"
    req_ok=$((req_ok + 1))
  else
    echo "MISS $name  (required for soft-live)"
    req_bad=$((req_bad + 1))
  fi
}

check_opt() {
  local name="$1"
  local present="$2"
  if [[ "$present" == "1" ]]; then
    echo "OK   $name  (paid only — optional until Stripe)"
    opt_ok=$((opt_ok + 1))
  else
    echo "skip $name  (paid only — optional until Stripe)"
    opt_miss=$((opt_miss + 1))
  fi
}

echo "== Pikbo soft-live checklist =="
echo "Soft launch needs SESSION_SECRET + FAL_KEY only. Stripe is Coming soon."
echo
check_req "SESSION_SECRET|CREDITS_SECRET" "$([[ -n "${SESSION_SECRET:-}${CREDITS_SECRET:-}" ]] && echo 1 || echo 0)"
check_req "FAL_KEY (live generate)" "$([[ -n "${FAL_KEY:-}" ]] && echo 1 || echo 0)"
check_opt "SUPABASE_URL (auth + durable)" "$([[ -n "${SUPABASE_URL:-}${NEXT_PUBLIC_SUPABASE_URL:-}" ]] && echo 1 || echo 0)"
check_opt "SUPABASE_SERVICE_ROLE_KEY" "$([[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && echo 1 || echo 0)"
check_opt "STRIPE_SECRET_KEY (test only for Phase I)" "$([[ -n "${STRIPE_SECRET_KEY:-}" ]] && echo 1 || echo 0)"
check_opt "STRIPE_WEBHOOK_SECRET" "$([[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]] && echo 1 || echo 0)"
check_opt "STRIPE_PRICE_CREATOR" "$([[ -n "${STRIPE_PRICE_CREATOR:-}" ]] && echo 1 || echo 0)"
check_opt "STRIPE_PRICE_SHOP" "$([[ -n "${STRIPE_PRICE_SHOP:-}" ]] && echo 1 || echo 0)"
check_opt "NEXT_PUBLIC_PAYMENTS_ENABLED (keep 0 for Mode A)" "$([[ "${NEXT_PUBLIC_PAYMENTS_ENABLED:-0}" == "1" ]] && echo 1 || echo 0)"
check_opt "VIDEO_PROVIDER_WEBHOOK_SECRET (prod async webhooks)" "$([[ -n "${VIDEO_PROVIDER_WEBHOOK_SECRET:-}" ]] && echo 1 || echo 0)"
if [[ "${STRIPE_SECRET_KEY:-}" == sk_live_* ]]; then
  echo "WARN STRIPE_SECRET_KEY looks like sk_live — blocked without PAYMENTS_LIVE=1"
fi
if [[ "${PIKBO_T6_FILE_BAKE:-}" == "1" ]]; then
  echo "OK   PIKBO_T6_FILE_BAKE=1 (operator asserts file watermark bake)"
else
  echo "skip T6 file bake  (Free raw download stays blocked — correct for Mode A)"
fi

if [[ -n "${1:-}" ]]; then
  BASE="${1}"
  export NO_PROXY="*" no_proxy="*"
  unset ALL_PROXY all_proxy HTTP_PROXY HTTPS_PROXY http_proxy https_proxy 2>/dev/null || true
  echo
  echo "Probing ${BASE}/api/health …"
  code=$(curl --noproxy '*' -sS -o /tmp/pikbo-softlive-health.json -w "%{http_code}" -m 15 "${BASE}/api/health" || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "OK   /api/health HTTP 200"
    if command -v python3 >/dev/null 2>&1; then
      python3 - <<'PY'
import json
h=json.load(open("/tmp/pikbo-softlive-health.json"))
print("mode=", h.get("mode"))
print("ready=", h.get("ready"))
print("rateLimit=", h.get("rateLimit"))
print("assets=", h.get("assets"))
print("jobs=", h.get("jobs"))
print("imageJobs=", h.get("imageJobs"))
product=h.get("product") or {}
if product:
    print(
        "product primary=", product.get("primary"),
        "cancelGenerate=", product.get("cancelGenerate"),
        "cancelImage=", product.get("cancelImage"),
        "downloadGate=", product.get("downloadGate"),
    )
bs=(h.get("jobs") or {}).get("byStatus") or {}
if "canceled" in bs:
    print("jobs.byStatus.canceled=", bs.get("canceled"))
print("demos=", h.get("demos"))
print("community=", h.get("community"))
print("videoWebhook=", h.get("videoWebhook"))
billing=(h.get("billing") or {}).get("freeTrial") or {}
if billing:
    print(
        "billing.freeTrial scope=", billing.get("scope"),
        "stillsOnFree=", billing.get("stillsOnFree"),
        "refunds=", billing.get("failedLiveRefunds"),
    )
cl=h.get("softLiveChecklist") or {}
print("checklist fal=", cl.get("FAL_KEY"), "sessionSecret=", cl.get("SESSION_SECRET"))
print("entitlements writable=", (h.get("entitlements") or {}).get("writable"))
ready = h.get("ready") or {}
demos=h.get("demos") or {}
if demos.get("ok") is False:
    print("WARN demos.ok=false missing=", demos.get("missing"), demos.get("samples"))
if ready.get("softLive"):
    print("softLive ready= true")
elif ready.get("demo"):
    print("softLive ready= false (demo-cached only — set FAL_KEY + SESSION_SECRET for live)")
PY
    fi
  else
    echo "FAIL /api/health HTTP $code"
    req_bad=$((req_bad + 1))
  fi
fi

echo
echo "Summary: soft-live required $req_ok ok / $req_bad miss · paid-optional $opt_ok present / $opt_miss skip"
echo "See docs/LAUNCH.md — Sunday soft: SESSION_SECRET + FAL_KEY only."
# Non-zero only if remote probe failed; local env misses are informational.
exit 0
