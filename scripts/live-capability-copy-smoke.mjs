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

// AIT-233: TrustStrip + ProfilePanel — Free Mini only when Live open.
// Fail-closed while /api/me is loading (parity FreeTrialCta freeLiveOpen).
const residualStaticTrust = [
  "components/TrustStrip.tsx",
  "components/ProfilePanel.tsx",
];
for (const relativePath of residualStaticTrust) {
  const source = read(relativePath);
  assert(
    /canLiveGenerate\s*\(/.test(source),
    `${relativePath} must gate Free Mini / product caps on canLiveGenerate`
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
const trustStripSource = read("components/TrustStrip.tsx");
assert(
  !/Free Mini · 5s · 480p · on-player mark · refunds when confirmed/.test(
    trustStripSource.replace(
      /freeLiveOpen[\s\S]*?\?[\s\S]*?:[\s\S]*?;/,
      ""
    )
  ) ||
    /freeLiveOpen[\s\S]{0,400}Free Mini/.test(trustStripSource),
  "TrustStrip must not hardcode Free Mini product caps outside freeLiveOpen"
);
assert(
  trustStripSource.includes("Live gated · Cached Lab") &&
    trustStripSource.includes("refunds when confirmed"),
  "TrustStrip must prefer Live gated / Cached Lab honesty when Live is closed"
);
assert(
  /freeLiveOpen[\s\S]{0,500}Free Mini/.test(trustStripSource),
  "TrustStrip Free Mini product caps must sit behind freeLiveOpen"
);
const profilePanelSource = read("components/ProfilePanel.tsx");
assert(
  profilePanelSource.includes("data-profile-free-live") &&
    profilePanelSource.includes("Live gated") &&
    profilePanelSource.includes("Cached Lab previews remain free"),
  "ProfilePanel must expose Live gated / Cached Lab copy when freeLiveOpen is false"
);
assert(
  /freeLiveOpen[\s\S]{0,200}freeLiveModelLabel|freeLiveOpen \? \(/.test(
    profilePanelSource
  ),
  "ProfilePanel Free Mini model label must only render when freeLiveOpen"
);
// Free Mini product-cap span (resolution · duration) only under freeLiveOpen branch.
assert(
  /freeLiveOpen \? \(/.test(profilePanelSource) ||
    /freeLiveOpen[\s\S]{0,80}trialDone/.test(profilePanelSource),
  "ProfilePanel free-plan honesty banner must branch on freeLiveOpen"
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
