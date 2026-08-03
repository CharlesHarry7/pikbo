#!/usr/bin/env bash
# Wire Stripe TEST mode for Founding Studio after keys exist in .env.stripe.local
# Usage:
#   1) Create .env.stripe.local (gitignored) with:
#        STRIPE_SECRET_KEY=sk_test_...
#        STRIPE_WEBHOOK_SECRET=whsec_...
#        STRIPE_PRICE_FOUNDING_STUDIO=price_...
#   2) ./scripts/wire-stripe-test-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ENVF="${1:-.env.stripe.local}"
if [[ ! -f "$ENVF" ]]; then
  echo "missing $ENVF"
  echo "Create it with STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_FOUNDING_STUDIO"
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENVF"
set +a
need() { [[ -n "${!1:-}" ]] || { echo "missing $1"; exit 1; }; }
need STRIPE_SECRET_KEY
need STRIPE_WEBHOOK_SECRET
need STRIPE_PRICE_FOUNDING_STUDIO
case "$STRIPE_SECRET_KEY" in
  sk_test_*) ;;
  *) echo "Refusing non-test secret. Use sk_test_ only until live approval."; exit 1 ;;
esac
upsert() {
  local k="$1" v="$2"
  if vercel env ls production 2>&1 | grep -q " $k "; then
    printf '%s' "$v" | vercel env rm "$k" production -y >/dev/null
  fi
  printf '%s' "$v" | vercel env add "$k" production >/dev/null
  echo "set $k"
}
upsert STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
upsert STRIPE_WEBHOOK_SECRET "$STRIPE_WEBHOOK_SECRET"
upsert STRIPE_PRICE_FOUNDING_STUDIO "$STRIPE_PRICE_FOUNDING_STUDIO"
upsert NEXT_PUBLIC_PAYMENTS_ENABLED "1"
upsert PAYMENTS_LIVE "0"
upsert STRIPE_BILLING_RPC_READY "1"
upsert STRIPE_REFUND_DISPUTE_GUARD_READY "0"
echo "Redeploying production..."
vercel deploy --prod --yes
echo "Done. Check: curl -s https://pikbo.ai/api/health | jq .payments"
