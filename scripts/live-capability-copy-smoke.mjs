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
  "app/tools/page.tsx",
  "app/for/page.tsx",
  "app/guides/page.tsx",
  "app/toys/page.tsx",
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

/** SEO hub FAQs/chips (tools / for / guides / toys) — no public Free Mini live trial. */
const seoHubFiles = [
  "app/tools/page.tsx",
  "app/for/page.tsx",
  "app/guides/page.tsx",
  "app/toys/page.tsx",
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

/** Residual hub chips/FAQ claims that sold Free Mini as an unconditional live trial. */
const forbiddenSeoHubFreeMini = [
  /Free Mini live is about one Seedance Mini/i,
  /Free Mini limits \(5s · 480p/i,
  /Free Mini 5s · 480p/i,
  /One job per page · Free Mini ·/i,
  /How-tos · Free Mini 5s ·/i,
  /Subject landings · Free Mini 5s ·/i,
  /Free Mini caps apply/i,
  /labelTry="Try free Mini"/,
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

for (const relativePath of seoHubFiles) {
  const source = read(relativePath);
  for (const pattern of forbiddenSeoHubFreeMini) {
    assert(
      !pattern.test(source),
      `${relativePath} contains residual Free Mini hub promise ${pattern}`
    );
  }
  assert(
    source.includes("cached Lab") ||
      source.includes("Lab prototype") ||
      source.includes("Lab preview"),
    `${relativePath} must keep Lab public-path honesty language`
  );
}

assert(
  read("app/tools/page.tsx").includes("Live remains gated") &&
    read("app/tools/page.tsx").includes(
      "When Live is enabled for an eligible account"
    ) &&
    !read("app/tools/page.tsx").includes(
      "Free Mini live is about one Seedance Mini"
    ),
  "tools hub must sell Lab public path + conditional Live, not Free Mini live trial"
);
assert(
  read("app/for/page.tsx").includes("cached Lab") &&
    !read("app/for/page.tsx").includes("One job per page · Free Mini ·"),
  "for hub must not chip Free Mini as the public free trial"
);
assert(
  read("app/guides/page.tsx").includes(
    "When Live is enabled for an eligible account"
  ) &&
    read("app/guides/page.tsx").includes("labeled cached Lab prototype") &&
    !read("app/guides/page.tsx").includes("How-tos · Free Mini 5s ·"),
  "guides hub FAQ must keep Lab public path and conditional Live quotes"
);
assert(
  read("app/toys/page.tsx").includes("Public path is cached Lab") &&
    read("app/toys/page.tsx").includes("Live remains gated") &&
    !read("app/toys/page.tsx").includes('labelTry="Try free Mini"') &&
    !read("app/toys/page.tsx").includes("Subject landings · Free Mini 5s ·"),
  "toys hub must drop Free Mini chip and keep Lab public path"
);

// AIT-290: Modules residual — FAQ + shelf chip no longer sell Free Mini as public-open live.
const modulesSource = read("app/modules/page.tsx");
const forbiddenModulesFreeMini = [
  /What does Free Mini cover on Modules\?/i,
  /Free Mini raw download gated until T6 bake/i,
  /The configured allowance is about one Mini job only when Live is enabled/i,
];
for (const pattern of forbiddenModulesFreeMini) {
  assert(
    !pattern.test(modulesSource),
    `app/modules/page.tsx contains residual Free Mini modules promise ${pattern}`
  );
}
assert(
  modulesSource.includes("What does the public free path cover on Modules?") &&
    modulesSource.includes("Cached Lab prototypes cost 0 credits") &&
    modulesSource.includes(
      "When Live is enabled for an eligible account"
    ) &&
    modulesSource.includes("Free-plan raw download stays gated until T6 bake") &&
    modulesSource.includes("When Live is enabled, Seedance video out"),
  "modules FAQ/chip must sell Lab public path + conditional Live, not Free Mini as public trial"
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

// AIT-231: closed billing honesty — disclose founding rate, keep checkout closed.
assert(
  read("components/PricingHeroCopy.tsx").includes(
    "No subscription is on sale today."
  ) &&
    read("components/PricingHeroCopy.tsx").includes("$49") &&
    read("components/PricingHeroCopy.tsx").includes("checkout closed"),
  "pricing hero must disclose $49 founding rate while stating checkout is closed"
);
assert(
  read("components/PricingPlanCards.tsx").includes("$49 founding rate") &&
    read("components/PricingPlanCards.tsx").includes("checkout closed") &&
    !read("components/PricingPlanCards.tsx").includes("Price pending"),
  "pricing cards must disclose $49 founding rate (not Price pending) with checkout closed"
);
assert(
  read("components/PaywallCard.tsx").includes(
    "Founding rate is $49/month for nine directed Moments"
  ) &&
    read("components/PaywallCard.tsx").includes("checkout closed") &&
    !read("components/PaywallCard.tsx").includes(
      "No public price, monthly allowance, subscription, or checkout is available."
    ),
  "paywall must disclose founding rate while keeping live checkout closed"
);
assert(
  read("lib/pricing.ts").includes(
    "Join Founding Studio when billing opens"
  ) &&
    read("lib/pricing.ts").includes(
      "Cached Lab previews before sign-in · product photo needs private beta"
    ),
  "plan CTAs must not imply live purchase or free-plan product-photo upload"
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

// Residual session UI — Free Mini left/used only behind freeLiveOpen.
// Fail-closed while /api/me is loading (parity FreeTrialCta).
const residualSessionUi = [
  "components/SoftLaunchStrip.tsx",
  "components/CreditsBadge.tsx",
  "components/ModulesSuiteCtas.tsx",
  "components/ModulesMobileCta.tsx",
  "components/LandingToolPanel.tsx",
  "components/FreeTrialCta.tsx",
  // AIT-330: BatchStudio product-cap / trial-used / pack-credit residual
  "components/BatchStudio.tsx",
  // AIT-343: CreateStudio product-cap / trial-used residual
  "components/CreateStudio.tsx",
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

// AIT-330: BatchStudio — Free Mini product-cap / trial-used / pack-credit only when freeLiveOpen.
const batchStudioSource = read("components/BatchStudio.tsx");
assert(
  batchStudioSource.includes("Cached Lab · 0 credits · Live gated"),
  "BatchStudio must prefer Cached Lab · 0 credits · Live gated when Live is closed"
);
assert(
  /freeLiveOpen[\s\S]{0,120}\?[\s\S]{0,80}Free Mini trial used|freeLiveOpen &&[\s\S]{0,80}Free Mini trial used|freeLiveOpen\s*\?\s*[\s\S]{0,40}`Free Mini/.test(
    batchStudioSource
  ),
  "BatchStudio Free Mini trial-used / product-cap must sit behind freeLiveOpen"
);
assert(
  /clipsLeft !== null && freeLiveOpen && !trialDone|freeLiveOpen && !trialDone[\s\S]{0,40}clipsLeft/.test(
    batchStudioSource
  ),
  "BatchStudio ~N live left must be gated by freeLiveOpen (no invented pack credits)"
);
assert(
  /freeLiveOpen[\s\S]{0,200}Free Mini covers one 10-cr job|freeLiveOpen \? \([\s\S]{0,120}Free Mini covers one 10-cr job/.test(
    batchStudioSource
  ),
  "BatchStudio Free Mini pack-credit honesty must sit behind freeLiveOpen"
);
assert(
  batchStudioSource.includes("Live gated · Launch Pack needs 30 live credits") ||
    batchStudioSource.includes(
      "Live pack credits are not available while Live is closed"
    ),
  "BatchStudio closed Live path must not invent free pack credits"
);

// AIT-343: CreateStudio + directorPlan residual Free Mini honesty (freeLiveOpen).
const createStudioSource = read("components/CreateStudio.tsx");
assert(
  /canLiveGenerate\s*\(/.test(createStudioSource) &&
    /freeLiveOpen/.test(createStudioSource) &&
    /liveEnabled\s*!==\s*false/.test(createStudioSource),
  "CreateStudio must define freeLiveOpen (Live gate truth)"
);
assert(
  createStudioSource.includes("Cached Lab · 0 credits · Live gated"),
  "CreateStudio must prefer Cached Lab · 0 credits · Live gated when Live is closed"
);
assert(
  /trialDone && isFree && freeLiveOpen|freeLiveOpen && trialDone && isFree/.test(
    createStudioSource
  ) ||
    /trialDone && isFree && freeLiveOpen[\s\S]{0,120}Free Mini trial used/.test(
      createStudioSource
    ),
  "CreateStudio Free Mini trial-used must sit behind freeLiveOpen"
);
assert(
  /clipsLeft !== null && freeLiveOpen && !trialDone|freeLiveOpen && !trialDone[\s\S]{0,40}clipsLeft/.test(
    createStudioSource
  ),
  "CreateStudio ~N live left must be gated by freeLiveOpen"
);
assert(
  /freeLiveOpen[\s\S]{0,80}buildDirectorPlan|freeLiveOpen,/.test(
    createStudioSource
  ),
  "CreateStudio must pass freeLiveOpen into buildDirectorPlan"
);

const directorPlanSource = read("lib/directorPlan.ts");
assert(
  /freeLiveOpen\??:\s*boolean|freeLiveOpen\s*===\s*true|input\.freeLiveOpen/.test(
    directorPlanSource
  ),
  "directorPlan must accept freeLiveOpen for Free Mini honesty"
);
assert(
  /freeLiveOpen[\s\S]{0,200}Free Mini trial exhausted|input\.trialDone && input\.isFree && freeLiveOpen/.test(
    directorPlanSource
  ),
  "directorPlan Free Mini trial-exhausted blocker must sit behind freeLiveOpen"
);
assert(
  /freeLiveOpen[\s\S]{0,200}Free Mini covers one 10-credit job|input\.trialDone && input\.isFree && freeLiveOpen[\s\S]{0,120}Free Mini covers/.test(
    directorPlanSource
  ),
  "directorPlan Free Mini pack blocker must sit behind freeLiveOpen"
);
assert(
  directorPlanSource.includes("Cached Lab · 0 credits · Live gated") ||
    directorPlanSource.includes(
      "Live gated · Launch Pack needs 30 live credits when Live opens"
    ),
  "directorPlan closed Live path must prefer Cached Lab / Live gated honesty"
);
assert(
  /clipsLeft !== null && freeLiveOpen|freeLiveOpen[\s\S]{0,80}clipsLeft/.test(
    directorPlanSource
  ),
  "directorPlan ~N live left cost labels must be gated by freeLiveOpen"
);
assert(
  /freeLiveOpen/.test(batchStudioSource) &&
    /freeLiveOpen,/.test(batchStudioSource),
  "BatchStudio must pass freeLiveOpen into buildSellerPackDirectorPlan"
);

// Community must stay fail-closed on fake UGC (no invented posts/likes).
const community = read("app/community/page.tsx");
assert(
  community.includes("never invent") ||
    community.includes("We never invent") ||
    community.includes("never invent fake"),
  "community page must state that UGC is never invented"
);
assert(
  !/fake likes|invented accounts|placeholder posts/i.test(community) ||
    /never invent likes|never invent fake|No fake likes/i.test(community),
  "community must not present fake social proof without an explicit denial"
);

// AIT-257 residual: TrustStrip + ProfilePanel + LandingHowItWorks + HfProductRail.
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
  /freeLiveOpen \? \(/.test(profilePanelSource) ||
    /freeLiveOpen[\s\S]{0,80}trialDone/.test(profilePanelSource),
  "ProfilePanel free-plan honesty banner must branch on freeLiveOpen"
);

const landingHowItWorksSource = read("components/LandingHowItWorks.tsx");
assert(
  !/Seedance Mini with honest Free Mini caps/.test(landingHowItWorksSource),
  "LandingHowItWorks must not hardcode Seedance Mini / Free Mini caps"
);
assert(
  !/Free Mini:\s*~?5s\s*·\s*480p/.test(landingHowItWorksSource),
  "LandingHowItWorks must not hardcode Free Mini · 5s · 480p product caps"
);
assert(
  landingHowItWorksSource.includes("Live gated") &&
    landingHowItWorksSource.includes("Cached Lab") &&
    landingHowItWorksSource.includes("refunds when confirmed"),
  "LandingHowItWorks must prefer Live-gated / Cached Lab honesty while Live is closed"
);
assert(
  /data-landing-hiw-cap=["']lab-gated["']/.test(landingHowItWorksSource),
  "LandingHowItWorks must mark lab-gated soft-launch honesty"
);

const hfProductRailSource = read("components/HfProductRail.tsx");
assert(
  /canLiveGenerate\s*\(/.test(hfProductRailSource) &&
    /freeLiveOpen/.test(hfProductRailSource) &&
    /liveEnabled\s*!==\s*false/.test(hfProductRailSource),
  "HfProductRail must gate Free Mini product caps on freeLiveOpen"
);
assert(
  hfProductRailSource.includes("Cached Lab · 0 credits · Live gated") ||
    hfProductRailSource.includes("Lab sample · 0 credits"),
  "HfProductRail closed path must use Cached Lab / 0 credits honesty"
);
assert(
  /freeLiveOpen[\s\S]{0,120}\?[\s\S]{0,80}Lab sample · Free Mini 5s/.test(
    hfProductRailSource
  ),
  "HfProductRail Free Mini 5s must sit behind freeLiveOpen ternary"
);
assert(
  /data-hf-rail-free-cap/.test(hfProductRailSource),
  "HfProductRail must expose data-hf-rail-free-cap for free-live vs lab-gated"
);

// i18n marketing chips — no unconditional Free Mini 5s as public free trial.
const i18nSource = read("lib/i18n.ts");
assert(
  !/"modules\.mobile\.hint":\s*"[^"]*Free Mini 5s/.test(i18nSource),
  "i18n modules.mobile.hint must not hardcode Free Mini 5s"
);
assert(
  !/"suite\.tryFree\.blurb":\s*"[^"]*Free Mini 5/.test(i18nSource),
  "i18n suite.tryFree.blurb must not hardcode Free Mini 5s as public free path"
);
assert(
  !/"home\.browseCta\.chip":\s*"[^"]*Free Mini/.test(i18nSource),
  "i18n home.browseCta.chip must not hardcode Free Mini as public free path"
);
assert(
  i18nSource.includes("Cached Lab") || i18nSource.includes("0 credits"),
  "i18n must keep Cached Lab / 0 credits honesty on free path chips"
);

// AIT-375: residual Free Mini marketing chips in static locale strings.
assert(
  !/"cta\.tryMiniFree":\s*"[^"]*Try Mini free/.test(i18nSource) &&
    !/"cta\.tryMiniFree":\s*"[^"]*免费试用 Mini/.test(i18nSource) &&
    !/"cta\.tryMiniFree":\s*"[^"]*Miniを無料/.test(i18nSource) &&
    !/"cta\.tryMiniFree":\s*"[^"]*Prueba Mini gratis/.test(i18nSource),
  "i18n cta.tryMiniFree must not sell Mini free as the public free path"
);
assert(
  !/"home\.tryFree10s":\s*"[^"]*Mini 5s/.test(i18nSource) &&
    !/"home\.tryFree10s":\s*"[^"]*Mini 5 秒/.test(i18nSource),
  "i18n home.tryFree10s must not hardcode Mini 5s as public free path"
);
assert(
  !/"home\.pitch\.b1":\s*"[^"]*Mini 5 秒/.test(i18nSource) &&
    !/"home\.feat\.mini\.sub":\s*"[^"]*免费一次 5 秒/.test(i18nSource) &&
    !/"home\.promo\.sub":\s*"[^"]*免费 Mini 试用/.test(i18nSource) &&
    !/"home\.icp\.eyebrow":\s*"[^"]*免费 Mini 试用/.test(i18nSource) &&
    !/"home\.hero1\.title":\s*"[^"]*Seedance Mini 免费路径/.test(i18nSource),
  "i18n ZH marketing keys must not sell Free Mini as unconditional public trial"
);
assert(
  i18nSource.includes("Try Lab sample →") &&
    i18nSource.includes("Try free video · Lab sample") &&
    i18nSource.includes("Cached Lab 样片 · 免费") &&
    i18nSource.includes("配置配方 · 访问受控"),
  "i18n residual free-path chips must stay Lab-first / access gated"
);
assert(
  !/"create\.freeLock":\s*"[^"]*Free trial locked to Mini/.test(i18nSource) &&
    !/"create\.freeLock":\s*"[^"]*免费试用锁定 Mini/.test(i18nSource),
  "i18n create.freeLock must not imply public Free Mini lock as always open"
);
assert(
  !/"onboard\.sub":\s*"[^"]*免费 Mini 5 秒/.test(i18nSource),
  "i18n onboard.sub must not sell Free Mini 5s as unconditional public trial"
);

// AIT-298: Home suite residual — HowItWorks / Onboarding / FeatureCarousel.
const howItWorksSource = read("components/HowItWorks.tsx");
assert(
  !howItWorksSource.includes('labelTry="Try free · Mini 5s"') &&
    !howItWorksSource.includes("Mini 5s"),
  "HowItWorks must not hardcode Mini 5s as public free trial CTA"
);
assert(
  howItWorksSource.includes('labelTry="Try free · Lab"') &&
    howItWorksSource.includes("FreeTrialCta"),
  "HowItWorks must prefer Lab-first try label"
);

const onboardingBannerSource = read("components/OnboardingBanner.tsx");
assert(
  !onboardingBannerSource.includes("Mini 5s") &&
    !onboardingBannerSource.includes("Free Mini"),
  "OnboardingBanner must not hardcode Mini 5s / Free Mini trial CTA"
);
assert(
  onboardingBannerSource.includes("· Lab") &&
    onboardingBannerSource.includes("FreeTrialCta"),
  "OnboardingBanner must prefer Lab-first try label"
);

const homeFeatureCarouselSource = read("components/HomeFeatureCarousel.tsx");
assert(
  !homeFeatureCarouselSource.includes("Seedance Mini trial") &&
    !homeFeatureCarouselSource.includes("live: 5s / 480p") &&
    !homeFeatureCarouselSource.includes("Try Mini") &&
    !/Mini 5s/.test(homeFeatureCarouselSource),
  "HomeFeatureCarousel must not sell Seedance Mini / 5s as public free trial"
);
assert(
  homeFeatureCarouselSource.includes("Cached Lab") &&
    (homeFeatureCarouselSource.includes("0 credits") ||
      homeFeatureCarouselSource.includes("Live gated")) &&
    homeFeatureCarouselSource.includes("Try Lab"),
  "HomeFeatureCarousel seedance promo must use Cached Lab · 0 credits / Live gated honesty"
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
