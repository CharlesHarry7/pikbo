#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== Pikbo preflight =="
echo "node $(node -v)"
if git grep -nE '^(<<<<<<<|>>>>>>>|=======)' -- app lib components 2>/dev/null; then
  echo "FAIL: conflict markers"
  exit 1
fi
echo "OK: no conflict markers"

# Lab demos must exist (soft-launch / demo-generate path)
missing=0
for f in \
  public/demos/orbit-hyper-cgi.mp4 \
  public/demos/moon-box-reveal.mp4 \
  public/demos/scout-packshot-spin.mp4 \
  public/demos/beatbot-viral-hook.mp4 \
  public/demos/orbit-dance.mp4 \
  public/demos/moon-glow.mp4 \
  public/demos/scout-walk.mp4 \
  public/demos/beatbot-neon.mp4 \
  public/demos/orbit-aura.mp4 \
  public/demos/moon-smoke.mp4 \
  public/demos/scout-story-mode.mp4 \
  public/demos/beatbot-unboxed.mp4
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: missing $f"
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi
echo "OK: lab demos present"

# One-click sample stills for Studio / Batch
missing_still=0
for f in \
  public/demos/orbit-still.webp \
  public/demos/moon-float.webp \
  public/demos/scout-still.webp \
  public/demos/beatbot-still.webp
do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: missing sample still $f"
    missing_still=1
  fi
done
if [[ "$missing_still" -ne 0 ]]; then
  exit 1
fi
echo "OK: sample stills present"

# Source-of-truth paths from lib/demoClips + lib/samples (engine-smoke also asserts)
node -e "
const fs=require('fs');const path=require('path');
const root=process.cwd();
function pathsFrom(file, re){
  const t=fs.readFileSync(path.join(root,file),'utf8');
  return [...t.matchAll(re)].map(m=>m[1]);
}
const demos=pathsFrom('lib/demoClips.ts', /[\"'](\\/demos\\/[^\"']+)[\"']/g);
const samples=pathsFrom('lib/samples.ts', /path:\\s*[\"'](\\/demos\\/[^\"']+)[\"']/g);
let miss=0;
for (const p of new Set([...demos,...samples])) {
  const disk=path.join(root,'public',p.replace(/^\\//,''));
  if (!fs.existsSync(disk)) { console.error('FAIL missing', p); miss=1; }
}
if (miss) process.exit(1);
console.log('OK: demoClips+samples disk assets', new Set([...demos,...samples]).size);
"

node scripts/engine-smoke.mjs
echo "OK: engine-smoke"

# Residual CTA honesty (source-only) — fail closed for Moment + Generate doors
node scripts/moment-create-href-smoke.mjs
echo "OK: moment-create-href-smoke"
node scripts/generate-360-cta-smoke.mjs
echo "OK: generate-360-cta-smoke"

npm run lint
npm run typecheck
npm run build
echo "OK: build green"
