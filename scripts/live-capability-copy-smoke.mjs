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

// AIT-217: residual session UI — Free Mini left/used only behind freeLiveOpen.
// Fail-closed while /api/me is loading (parity FreeTrialCta).
const residualSessionUi = [
  "components/SoftLaunchStrip.tsx",
  "components/CreditsBadge.tsx",
  "components/ModulesSuiteCtas.tsx",
  "components/ModulesMobileCta.tsx",
  "components/LandingToolPanel.tsx",
  "components/FreeTrialCta.tsx",
];
for (const relativePath of residualSessionUi) {
  const source = read(relativePath);
  assert(
    /canLiveGenerate\s*\(/.test(source),
    `${relativePath} must gate Free Mini / Live chips on canLiveGenerate`
  );
  assert(
    /freeLiveOpen/.test(source),
    `${relativePath} must define freeLiveOpen (Live gate truth)`
  );
  assert(
    /liveEnabled\s*!==\s*false/.test(source),
    `${relativePath} must require freeLive.liveEnabled !== false`
  );
}
assert(
  read("components/SoftLaunchStrip.tsx").includes(
    "Cached Lab preview · 0 credits"
  ),
  "SoftLaunchStrip must prefer Cached Lab preview copy when Live is closed"
);
assert(
  read("components/ModulesSuiteCtas.tsx").includes(
    "Cached Lab preview · 0 credits"
  ),
  "ModulesSuiteCtas must show Cached Lab chip when Live is closed"
);
assert(
  read("components/CreditsBadge.tsx").includes("live gated") &&
    read("components/CreditsBadge.tsx").includes(
      "Cached Lab preview · 0 credits"
    ),
  "CreditsBadge must drop Free Mini product-cap copy when freeLiveOpen is false"
);
assert(
  read("components/LandingToolPanel.tsx").includes("Live gated") &&
    /freeLiveOpen[\s\S]{0,80}Free Mini used|!freeLiveOpen[\s\S]{0,200}Cached Lab preview/.test(
      read("components/LandingToolPanel.tsx")
    ),
  "LandingToolPanel exhausted/left chips must follow freeLiveOpen"
);
// Free Mini left chip must be rendered only under a freeLiveOpen ternary/&& gate.
for (const relativePath of [
  "components/ModulesSuiteCtas.tsx",
  "components/ModulesMobileCta.tsx",
  "components/FreeTrialCta.tsx",
]) {
  const source = read(relativePath);
  assert(
    /freeLiveOpen[\s\S]{0,220}~(\$\{clipsLeft\}|\{clipsLeft\}) Free Mini left/.test(
      source
    ),
    `${relativePath}: "~N Free Mini left" must be gated by freeLiveOpen`
  );
}

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
