#!/usr/bin/env bash
# Mode A private-preview acceptance (no public DNS, no Stripe live).
# Usage: BASE_URL=https://your.vercel.app bash scripts/mode-a-acceptance.sh
set -euo pipefail
export NO_PROXY="*" no_proxy="*"
unset ALL_PROXY all_proxy HTTP_PROXY HTTPS_PROXY http_proxy https_proxy 2>/dev/null || true

BASE="${BASE_URL:-${1:-http://127.0.0.1:3000}}"
BASE="${BASE%/}"

echo "== Pikbo Mode A acceptance @ ${BASE} =="
echo

# 1) Soft-live env presence (local only when env exported)
if [[ -n "${SESSION_SECRET:-}${CREDITS_SECRET:-}" || -n "${FAL_KEY:-}" ]]; then
  bash "$(dirname "$0")/softlive-checklist.sh" || true
  echo
fi

# 2) Critical path (pages + health honesty)
bash "$(dirname "$0")/critical-path.sh" "${BASE}"
echo

# 3) Link-check sample of public routes
if [[ -f "$(dirname "$0")/link-check.sh" ]]; then
  echo "== link-check =="
  bash "$(dirname "$0")/link-check.sh" "${BASE}" || {
    echo "WARN link-check failed — fix 404s before Mode B"
    exit 1
  }
  echo
fi

# 4) Health JSON gates for Mode A
curl --noproxy '*' -sS -m 15 "${BASE}/api/health" | tee /tmp/pikbo-mode-a-health.json >/dev/null
python3 - <<'PY'
import json, os, sys
h=json.load(open("/tmp/pikbo-mode-a-health.json"))
ready=h.get("ready") or {}
pay=h.get("payments") or {}
t6=h.get("t6") or {}
print("ready:", ready)
print("payments.clientEnabled:", pay.get("clientEnabled"), "secretMode:", pay.get("secretMode"))
print("t6:", t6.get("status"), t6.get("freeLiveRawDownload"))
if ready.get("demo") is not True:
    sys.exit("FAIL ready.demo must be true")
# Soft Mode A: payments must stay off for public-facing Coming soon honesty
if pay.get("clientEnabled") is True and os.environ.get("ALLOW_PAYMENTS_ON_MODE_A") != "1":
    print("WARN payments clientEnabled=true on Mode A — only OK on private test with boss approval")
if t6.get("status") == "ready" and t6.get("fileBake") is not True:
    sys.exit("FAIL t6 ready without fileBake is dishonest")
if t6.get("freeLiveRawDownload") == "allowed" and t6.get("status") != "ready":
    sys.exit("FAIL free live download allowed while T6 not ready")
# Production topup must be off
if h.get("devTopup") is True and os.environ.get("NODE_ENV") == "production":
    sys.exit("FAIL devTopup true in production")
# Ops probes must exist (presence only — never secrets)
assets=h.get("assets") or {}
if "count" not in assets and assets.get("mode") is None:
    print("WARN health.assets probe missing — preferred for Mode A ops")
else:
    print(f"assets count={assets.get('count')} mode={assets.get('mode')}")
jobs=h.get("jobs") or {}
if jobs:
    print(f"jobs count={jobs.get('count')} mode={jobs.get('mode')} open={jobs.get('open')} byStatus={jobs.get('byStatus')}")
    if "byStatus" not in jobs and jobs.get("mode") == "local-memory":
        print("WARN health.jobs.byStatus missing — preferred after jobId/probe ship")
    bs = jobs.get("byStatus") or {}
    if jobs.get("mode") == "local-memory" and bs and "canceled" not in bs:
        sys.exit("FAIL health.jobs.byStatus must include canceled (cancel ledger honesty)")
    if "canceled" in bs:
        print(f"jobs.byStatus.canceled={bs.get('canceled')}")
image_jobs = h.get("imageJobs") or {}
if image_jobs:
    ibs = image_jobs.get("byStatus") or {}
    print(f"imageJobs total={image_jobs.get('total')} open={image_jobs.get('open')} byStatus={ibs}")
    if ibs and "canceled" not in ibs and image_jobs.get("total", 0) > 0:
        # byStatus only has keys that appeared — empty canceled ok when no canceled jobs
        print("imageJobs.byStatus (sparse keys ok for still ledger)")
product=h.get("product") or {}
if product:
    print(f"product primary={product.get('primary')} stills={product.get('stills')}")
    if product.get("primary") != "video":
        sys.exit("FAIL health.product.primary must be video (video-first)")
    if product.get("stills") not in (None, "optional-support", "optional"):
        print("WARN health.product.stills should be optional-support")
elif True:
    print("WARN health.product missing — preferred video-first orientation probe")
billing=h.get("billing") or {}
bft=billing.get("freeTrial") or {}
if bft:
    soft_live=ready.get("softLive") is True
    print(
        f"billing.freeTrial clips={bft.get('clipsPerPeriod')} "
        f"model={bft.get('modelClass')} refunds={bft.get('failedLiveRefunds')} "
        f"scope={bft.get('scope')} stillsOnFree={bft.get('stillsOnFree')}"
    )
    if bft.get("available") is not soft_live:
        sys.exit("FAIL freeTrial.available must match ready.softLive")
    if soft_live:
        if bft.get("clipsPerPeriod") != 1:
            sys.exit("FAIL ready Soft Live must expose exactly one free clip")
        if bft.get("failedLiveRefunds") is not True:
            sys.exit("FAIL ready Soft Live must expose confirmed-failure restores")
        if bft.get("scope") != "video-create-only":
            sys.exit("FAIL ready Soft Live scope must be video-create-only")
    else:
        if bft.get("clipsPerPeriod") != 0:
            sys.exit("FAIL non-live health must not advertise a free live clip")
        if bft.get("failedLiveRefunds") is not False:
            sys.exit("FAIL non-live health must not advertise live refunds")
        if bft.get("scope") != "cached-demo-only":
            sys.exit("FAIL non-live health scope must be cached-demo-only")
    if bft.get("failedLiveRefundPolicy") not in (None, "when_confirmed"):
        sys.exit("FAIL freeTrial.failedLiveRefundPolicy must be when_confirmed when set")
    if bft.get("ledgerTimeoutRefund") not in (None, "unconfirmed"):
        sys.exit("FAIL freeTrial.ledgerTimeoutRefund must be unconfirmed when set")
    if bft.get("ledgerCancelRefund") not in (None, "unconfirmed"):
        sys.exit("FAIL freeTrial.ledgerCancelRefund must be unconfirmed when set")
    if bft.get("ledgerCancelRefund") == "unconfirmed":
        print("cancel refund policy=unconfirmed")
    if bft.get("failedLiveRefundPolicy") == "when_confirmed":
        print("refund policy=when_confirmed · TIMEOUT unconfirmed")
    if bft.get("scope") not in ("video-create-only", "cached-demo-only"):
        sys.exit("FAIL health.billing.freeTrial.scope is invalid")
    if bft.get("scope") == "video-create-only" and bft.get("stillsOnFree") not in (
        None,
        "demo-only",
    ):
        sys.exit("FAIL stillsOnFree must be demo-only when free trial is video-only")
else:
    print("WARN health.billing.freeTrial missing — preferred soft-launch contract")
demos=h.get("demos") or {}
if demos:
    print(
        f"demos ok={demos.get('ok')} present={demos.get('present')}/{demos.get('required')} "
        f"samples={ (demos.get('samples') or {}).get('present') }/{ (demos.get('samples') or {}).get('required') }"
    )
    if demos.get("ok") is not True:
        miss=demos.get("missing") or []
        sm=(demos.get("samples") or {}).get("missing") or []
        sys.exit(f"FAIL health.demos not ok — missing clips={miss} stills={sm}")
else:
    print("WARN health.demos probe missing — preferred Mode A Lab integrity")
comm=h.get("community") or {}
if comm:
    print(f"community ugcConfigured={comm.get('ugcConfigured')} note={comm.get('note')}")
else:
    print("WARN health.community missing — preferred Lab-only UGC honesty probe")
rl=h.get("rateLimit") or {}
if isinstance(rl, dict):
    print(f"rateLimit inflight={rl.get('inflight')} ttlMs={rl.get('inflightTtlMs')}")
vw=h.get("videoWebhook") or {}
if vw:
    print(f"videoWebhook secretConfigured={vw.get('secretConfigured')}")
    # On production Mode A hosts, secret should be set before enabling async provider
    if os.environ.get("VERCEL_ENV") == "production" and not vw.get("secretConfigured"):
        print("WARN VIDEO_PROVIDER_WEBHOOK_SECRET missing on production host — unsigned webhooks refused")
print("mode-a health honesty: PASS")
PY

echo
echo "mode-a-acceptance: PASS"
echo "Next: record BASE URL + health JSON in HANDOFF; do NOT bind pikbo.ai DNS yet."
