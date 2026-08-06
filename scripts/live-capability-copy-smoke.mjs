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
  "app/community/page.tsx",
  "app/explore/page.tsx",
  "app/effects/page.tsx",
  "app/tools/page.tsx",
  "app/for/page.tsx",
  "app/toys/page.tsx",
  "app/guides/page.tsx",
  "components/HomeSeoBody.tsx",
  "components/HomeCinemaHero.tsx",
  "components/HeroUpload.tsx",
  "components/CreateStudio.tsx",
  "components/PaywallCard.tsx",
  "components/PricingHeroCopy.tsx",
  "components/PricingPlanCards.tsx",
  "components/HfExploreHome.tsx",
  "components/SoftLaunchStrip.tsx",
  "components/LandingHowItWorks.tsx",
  "components/TrustStrip.tsx",
];

/** Public static copy that must not over-claim live Free Mini or open checkout. */
const publicFaqAndStripFiles = [
  "app/community/page.tsx",
  "app/explore/page.tsx",
  "app/effects/page.tsx",
  "app/apps/page.tsx",
  "app/tools/page.tsx",
  "app/for/page.tsx",
  "app/toys/page.tsx",
  "app/guides/page.tsx",
  "app/modules/page.tsx",
  "components/LandingHowItWorks.tsx",
  "components/TrustStrip.tsx",
];

/** Longform SEO surfaces (tools / for / guides) — no public Free Mini live trial promises. */
const longformSeoFiles = ["lib/tools.ts", "lib/usecases.ts", "lib/guides.ts"];

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

/** Unconditional public Free Mini live-trial claims (session-gated UI may still mention Free Mini). */
const forbiddenPublicFreeMini = [
  /Live Seedance Mini uses Free Mini/i,
  /Free Mini is for one live Seedance Mini/i,
  /Soft launch uses Seedance Mini with honest Free Mini/i,
  /Free Mini live is about one Seedance Mini/i,
  /Free Mini:\s*~?5s/i,
  /Free Mini · 5s · 480p/i,
  /Free Mini limits \(5s · 480p/i,
  /Free Mini 5s · 480p/i,
  /One job per page · Free Mini ·/i,
  /How-tos · Free Mini 5s ·/i,
  /Subject landings · Free Mini 5s ·/i,
];

const forbiddenLongformFreeMini = [
  /Soft launch Free Mini/i,
  /Free Mini caps apply/i,
  /Free Mini clips are/i,
  /Free Mini teasers are/i,
  /Free Mini validates/i,
  /Run Free Mini or a live job/i,
  /Seedance Mini on Free Mini/i,
  /Free Mini is 5s/i,
  /Free Mini is enough/i,
  /Free Mini:\s*~?5s/i,
  /Free Mini · 5s · 480p/i,
  /cookie period is exhausted/i,
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

for (const relativePath of publicFaqAndStripFiles) {
  const source = read(relativePath);
  for (const pattern of forbiddenPublicFreeMini) {
    assert(
      !pattern.test(source),
      `${relativePath} contains unconditional Free Mini live claim ${pattern}`
    );
  }
}

for (const relativePath of longformSeoFiles) {
  const source = read(relativePath);
  for (const pattern of forbiddenLongformFreeMini) {
    assert(
      !pattern.test(source),
      `${relativePath} contains residual Free Mini live promise ${pattern}`
    );
  }
  assert(
    source.includes("When Live is enabled for an eligible account") ||
      source.includes("cached Lab") ||
      source.includes("Lab prototype"),
    `${relativePath} must keep conditional Live / cached Lab honesty language`
  );
}

assert(
  read("components/LandingHowItWorks.tsx").includes(
    "Public path is a labeled Lab prototype"
  ) &&
    read("components/LandingHowItWorks.tsx").includes(
      "Cached previews: 0 credits"
    ),
  "landing how-it-works must describe cached public path, not Free Mini trial"
);
assert(
  read("components/TrustStrip.tsx").includes("Checkout closed") &&
    read("components/TrustStrip.tsx").includes("Cached Lab demos clearly labeled"),
  "trust strip must state closed checkout and labeled cached demos"
);
assert(
  read("app/community/page.tsx").includes(
    "Public live generation and paid checkout stay closed during validation"
  ) &&
    read("app/explore/page.tsx").includes("Live generation is gated") &&
    read("app/effects/page.tsx").includes("Live generation is gated"),
  "community/explore/effects FAQs must not sell unconditional Free Mini live"
);
assert(
  read("app/tools/page.tsx").includes("cached Lab") &&
    read("app/tools/page.tsx").includes("Live remains gated") &&
    !read("app/tools/page.tsx").includes("Free Mini live is about one Seedance Mini"),
  "tools hub must sell Lab public path, not Free Mini live trial"
);
assert(
  read("app/for/page.tsx").includes("cached Lab") &&
    !read("app/for/page.tsx").includes("One job per page · Free Mini ·"),
  "for hub must not chip Free Mini as the public free trial"
);
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
  read("components/PricingHeroCopy.tsx").includes("$49") &&
    read("components/PricingPlanCards.tsx").includes("$49 founding rate") &&
    read("components/PaywallCard.tsx").includes(
      "Founding rate is $49/month for nine directed Moments"
    ) &&
    read("components/PaywallCard.tsx").includes(
      "Public subscription purchase and live checkout stay closed"
    ),
  "closed-billing copy must disclose founding rate without implying live checkout"
);
assert(
  read("components/CreateStudio.tsx").includes(
    "Founding Studio · $49/mo founding rate · checkout closed"
  ) &&
    !read("components/CreateStudio.tsx").includes(
      "Continue creating · 9 Moments/month · $49"
    ),
  "fixed-Moment upgrade CTA must not imply checkout is open"
);
assert(
  read("components/PublicLaunchPackSample.tsx").includes(
    "Private Moment path · Street Power-Up · Live gated"
  ) &&
    !read("components/PublicLaunchPackSample.tsx").includes(
      "Private render available now"
    ),
  "home pack sample must not claim private render is publicly available now"
);
assert(
  read("app/pricing/page.tsx").includes("when billing opens") &&
    /Public\s+payment remains locked/.test(read("app/pricing/page.tsx")),
  "pricing page join label must stay closed-billing honest"
);
assert(
  read("lib/pricing.ts").includes(
    "Cached Lab previews before sign-in · product photo needs private beta"
  ) &&
    !read("lib/pricing.ts").includes("Upload and configure before sign-in"),
  "free plan perks must not claim product-photo upload before private beta"
);
assert(
  read("components/PricingCheckoutButton.tsx").includes(
    "Live checkout stays closed"
  ) &&
    read("components/PricingCheckoutButton.tsx").includes(
      "Cached Moment preview remains free"
    ),
  "closed checkout microcopy must not claim live purchase is open"
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
assert(
  rankToolSource.includes(
    "Public path is a cached Lab prototype at 0 credits"
  ) &&
    rankToolSource.includes(
      "When Live is enabled for an eligible account, Generate shows the exact duration"
    ),
  "tools longform must describe Lab public path and condition clip length on Live"
);
assert(
  read("lib/guides.ts").includes(
    "The public free path is a cached Pikbo Lab prototype at 0 credits"
  ) &&
    read("lib/guides.ts").includes(
      "When Live is enabled for an eligible account, Generate shows the configured model"
    ) &&
    !read("lib/guides.ts").includes("Run Free Mini or a live job"),
  "guides free-path article must keep Lab public path and conditional Live quotes"
);
assert(
  read("lib/usecases.ts").includes(
    "Public validation uses cached Lab prototypes at 0 credits"
  ) &&
    read("lib/usecases.ts").includes(
      "Live jobs remain gated until your account is eligible"
    ),
  "usecases longform must keep Lab public path and gated Live language"
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
