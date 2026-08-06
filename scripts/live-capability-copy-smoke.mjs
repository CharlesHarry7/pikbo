import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requireRendered = process.argv.includes("--require-rendered");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`live-capability copy smoke failed: ${message}`);
  }
}

const publicPromiseFiles = [
  "lib/site.ts",
  "lib/jsonLd.ts",
  "lib/tools.ts",
  "lib/usecases.ts",
  "lib/guides.ts",
  "lib/presets.ts",
  "app/page.tsx",
  "app/create/page.tsx",
  "app/pricing/page.tsx",
  "app/apps/page.tsx",
  "app/apps/[slug]/page.tsx",
  "app/modules/page.tsx",
  "app/flow/page.tsx",
  "app/cinema/page.tsx",
  "components/HomeSeoBody.tsx",
  "components/HomeCinemaHero.tsx",
  "components/HeroUpload.tsx",
  "components/CreateStudio.tsx",
  "components/PaywallCard.tsx",
  "components/PricingHeroCopy.tsx",
  "components/PricingPlanCards.tsx",
  "components/HfExploreHome.tsx",
  "components/SoftLaunchStrip.tsx",
];

const forbiddenUnconditional = [
  /Seedance live/i,
  /Pipeline is live/i,
  /Free live clip/i,
  /live Mini uses 10/i,
  /3 clips\s*\/\s*30 credits live/i,
  /Generate live/i,
  /Lab ≥4/i,
  /Free Mini trial(?:\s*[—·,:-]|\s+with|\s+for|\s*$)/i,
];

for (const relativePath of publicPromiseFiles) {
  const source = read(relativePath);
  for (const pattern of forbiddenUnconditional) {
    assert(
      !pattern.test(source),
      `${relativePath} contains unconditional public promise ${pattern}`
    );
  }
}

assert(
  read("lib/site.ts").includes("Turn one owned toy photo into product-listing") &&
    read("lib/site.ts").includes("AI product video studio for toy sellers"),
  "site metadata must lead with concrete seller outcomes and the gated private workflow"
);
assert(
  /When private Live is enabled,\s+eligible invited accounts\s+can create private 5-second 720p results/.test(
    read("components/HomeSeoBody.tsx")
  ),
  "home SEO body must condition real generation on the private Live gate"
);
assert(
  read("components/PricingHeroCopy.tsx").includes(
    "No subscription is on sale today."
  ),
  "pricing must keep subscriptions closed until private-beta proof"
);
assert(
  read("app/create/page.tsx").includes("fixedMomentContract") &&
    !read("app/create/page.tsx").includes("<BatchStudio") &&
    /fixedMomentContract\s*&&\s*!session\?\.signedIn/.test(
      read("components/CreateStudio.tsx")
    ) &&
    /privateUploadEnabled\s*\?\s*\([\s\S]*type="file"/.test(
      read("components/CreateStudio.tsx")
    ),
  "Create must expose only the fixed Moment and gate product-photo input behind private account capability"
);
assert(
  read("components/CreateStudio.tsx").includes(
    'data-public-single-preview="lab-only"'
  ) &&
    read("components/CreateStudio.tsx").includes(
      "Public preview does not accept or process product photos"
    ),
  "single Generate must hide upload controls until private access is verified"
);
const rankToolSource = read("lib/tools.ts");
assert(
  rankToolSource.includes("cached format previews") &&
    rankToolSource.includes("do not process the uploaded image"),
  "rank tool must explain that public previews are cached and never process the upload"
);
assert(
  rankToolSource.includes(
    "Private generation and subscriptions remain closed while quality, recovery, and cost are validated."
  ),
  "rank tool must keep private generation and subscriptions closed during validation"
);

// AIT-251: Home suite Free Mini honesty — freeLiveOpen only.
// HfProductRail Free card + FreeTrialCta labels: Lab sample / 0 credits when
// Live closed; Free Mini 5s only behind freeLiveOpen (parity FreeTrialCta).
const hfProductRailSource = read("components/HfProductRail.tsx");
assert(
  /canLiveGenerate\s*\(/.test(hfProductRailSource),
  "HfProductRail must gate Free Mini product caps on canLiveGenerate"
);
assert(
  /freeLiveOpen/.test(hfProductRailSource),
  "HfProductRail must define freeLiveOpen (Live gate truth)"
);
assert(
  /liveEnabled\s*!==\s*false/.test(hfProductRailSource),
  "HfProductRail must require freeLive.liveEnabled !== false"
);
assert(
  hfProductRailSource.includes("Lab sample · 0 credits"),
  "HfProductRail closed path must advertise Lab sample · 0 credits"
);
assert(
  /freeLiveOpen[\s\S]{0,160}\?[\s\S]{0,100}Lab sample · Free Mini 5s/.test(
    hfProductRailSource
  ),
  "HfProductRail Free Mini 5s must sit behind freeLiveOpen ternary"
);
assert(
  /data-hf-rail-free-cap/.test(hfProductRailSource),
  "HfProductRail must expose data-hf-rail-free-cap for free-live vs lab-gated"
);
// Free Mini 5s must not be bare static JSX (always-on residual claim).
assert(
  !/^\s*Lab sample · Free Mini 5s\s*$/m.test(hfProductRailSource),
  "HfProductRail must not hardcode bare Lab sample · Free Mini 5s as static JSX"
);
assert(
  !/labelTry=["']Try free · Mini 5s["']/.test(hfProductRailSource),
  "HfProductRail must not pass unconditional labelTry Mini 5s (gate on freeLiveOpen)"
);
assert(
  hfProductRailSource.includes("labelDemo={headerDemoLabel}") &&
    /headerDemoLabel\s*=\s*["']Lab sample · 0 credits["']/.test(
      hfProductRailSource
    ),
  "HfProductRail header FreeTrialCta must demote to Lab sample · 0 credits when Live closed"
);

function walkHtml(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.endsWith(".html")) output.push(absolute);
  }
  return output;
}

// Rendered output is intentionally opt-in: a stale .next directory must never
// make the source-only pre-build contract fail.
const renderedFiles = requireRendered
  ? walkHtml(path.join(root, ".next", "server", "app"))
  : [];
if (requireRendered) {
  assert(renderedFiles.length > 0, "no built route HTML found; run next build first");
}

for (const absolute of renderedFiles) {
  const html = fs.readFileSync(absolute, "utf8");
  for (const pattern of forbiddenUnconditional) {
    assert(
      !pattern.test(html),
      `${path.relative(root, absolute)} renders forbidden promise ${pattern}`
    );
  }
}

console.log(
  `live-capability copy smoke: PASS (${publicPromiseFiles.length} source files, ${renderedFiles.length} rendered routes)`
);
