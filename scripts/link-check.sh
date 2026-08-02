#!/usr/bin/env bash
# G4 soft check: known soft-launch inventory must not 404.
# Usage: bash scripts/link-check.sh [baseUrl]
set -euo pipefail
export NO_PROXY="*" no_proxy="*"
unset ALL_PROXY all_proxy HTTP_PROXY HTTPS_PROXY http_proxy https_proxy 2>/dev/null || true

# Prefer CLI arg, then BASE_URL env (CI), then local dev default.
BASE="${1:-${BASE_URL:-http://127.0.0.1:3000}}"
fail=0

check() {
  local path="$1"
  local want="${2:-200}"
  local code
  code=$(curl --noproxy '*' -sS -o /dev/null -w "%{http_code}" -m 20 -L "${BASE}${path}" || echo "000")
  if [[ "$code" != "$want" ]]; then
    echo "FAIL ${path} → HTTP ${code} (want ${want})"
    fail=$((fail + 1))
  else
    echo "OK   ${path} → ${code}"
  fi
}

echo "Pikbo G4 link-check @ ${BASE}"

# Critical path (+ suite Modules wall)
for p in / /create /modules /apps /effects /tools /library /pricing /community /explore /login /status /api/health /api/me; do
  check "$p"
done

# Wave A Seller Pack + Explore categories
check "/create?mode=seller-pack"
check "/create?job=etsy-listing"
check "/create?job=tiktok-hook"
check "/explore?cat=listing"
check "/explore?cat=unboxing"
check "/explore?cat=come-alive"
check "/explore?cat=social-hooks"
check "/explore?cat=story"

# Remake loop: official project detail (demo Lab id)
check "/projects/orbit-cgi"
check "/projects/moon-reveal"
check "/projects/not-a-registered-project" 404
check "/create?effect=360-spin-showcase&source=scout-spin&ratio=1:1&duration=5&channel=etsy"

# SEO tools cluster (sample — full list is in sitemap)
for p in \
  /tools/ai-toy-video-generator \
  /tools/toy-image-to-video-ai \
  /tools/ai-product-video-generator-for-toys \
  /tools/toy-unboxing-hook-generator \
  /tools/toy-social-content-pack
do
  check "$p"
done

# Real use-case SEO pages
for p in \
  /for/etsy-listing-videos \
  /for/tiktok-shop-product-videos \
  /for/amazon-product-videos \
  /for/instagram-reels-for-collectors \
  /for/blind-box-brand-marketing \
  /for/whatnot-live-selling \
  /for/depop-shop-videos
do
  check "$p"
done

# Roast short-slugs must land (redirect → 200 with -L)
for p in \
  /for/etsy-sellers \
  /for/etsy \
  /for/tiktok-shop \
  /for/tiktok \
  /for/amazon \
  /for/amazon-sellers \
  /for/instagram \
  /for/collectors \
  /for/blind-box \
  /for/whatnot \
  /for/depop
do
  check "$p"
done

# Company / legal / soft surfaces (+ preview hubs must still 200)
for p in /about /contact /privacy /refund /terms /guides /models /cinema /image /supercomputer /flow; do
  check "$p"
done

if [[ "$fail" -gt 0 ]]; then
  echo "link-check: FAIL ($fail)"
  exit 1
fi
echo "link-check: PASS"
