import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`product-proof smoke failed: ${message}`);
  }
}

const home = read("app/page.tsx");
const homeHero = read("components/HomeCinemaHero.tsx");
const moments = read("lib/moments.ts");
const softLaunch = read("lib/softLaunch.ts");
const feed = read("lib/videoFeed.ts");
const tile = read("components/VideoTile.tsx");
const presetPreview = read("components/PresetPreviewCard.tsx");
const autoplay = read("components/AutoPlayVideo.tsx");
const create = read("app/create/page.tsx");
const batch = read("components/BatchStudio.tsx");
const library = read("components/LibraryGrid.tsx");

const proofList =
  softLaunch.match(/HOME_PROOF_SLUGS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ??
  "";
const proofSlugs = [...proofList.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

assert(proofSlugs.length === 8, "homepage proof whitelist must contain exactly 8 recipes");
// Gallery-calm home (boss 2026-08): hero + designer-toy still gallery + trust.
// No multi-rail carnival; no cartoon demo wall as primary showcase.
assert(
  home.includes("<HomeCinemaHero />") &&
    homeHero.includes('data-home-hero="designer-toy-gallery"') &&
    homeHero.includes("href={MOMENT_CREATE_HREF}") &&
    homeHero.includes("data-home-moment-cta") &&
    (homeHero.match(/data-home-moment-cta/g) || []).length === 1 &&
    homeHero.includes("Create with my toy") &&
    homeHero.includes('createGenerate360Href("home-hero")') &&
    homeHero.includes("data-home-hero-360-cta") &&
    homeHero.includes('data-home-primary-generate="360"') &&
    homeHero.includes('data-home-hero-still-generate="360"') &&
    homeHero.includes("Generate 360° listing spin") &&
    homeHero.includes("art-vinyl-guardian") &&
    homeHero.includes("Style study") &&
    !homeHero.includes("Beatbot") &&
    !homeHero.includes("beatbot-still") &&
    home.includes("<HomeDesignerGallery") &&
    home.includes("<HomeTrustFooter") &&
    !home.includes("<HomeViralWall") &&
    !home.includes("<HomeExploreRecipeRail") &&
    !home.includes("<HfProductRail") &&
    !home.includes("<HomeBrowseCta") &&
    !home.includes("buildHomeShowcaseFeed") &&
    !home.includes("PublicLaunchPackSample") &&
    !home.includes('from "@/components/HfExploreHome"') &&
    !home.includes("<HfExploreHome") &&
    (moments.match(/evidence: "Official Concept",/g) || []).length === 6,
  "homepage must be calm hero + designer-toy gallery + trust (no multi-rail / cartoon demo wall)"
);
// Dual-path /create: Generate→360 deep links open workbench (not forced Moment)
assert(
  create.includes("resolveCreateRouteContract") &&
    create.includes('data-create-contract="generate-workbench"') &&
    create.includes("fixedMomentContract") &&
    create.includes('initialEffect="street-power-up"'),
  "create must dual-path workbench vs fixed Moment"
);
assert(
  !home.includes("buildViralPresetsWallFeed"),
  "homepage must not rebuild a larger demo wall outside the Showcase registry"
);
assert(
  proofSlugs.includes("360-spin-showcase"),
  "homepage proof whitelist must include 360-spin-showcase"
);
assert(
  proofSlugs.slice(0, 4).includes("360-spin-showcase"),
  "360-spin-showcase must sit in the first 4 home proof slots (mobile 2×2 above fold)"
);
const homeWall = read("components/HomeDesignerGallery.tsx");
const galleryLib = read("lib/designerToyGallery.ts");
assert(
  homeWall.includes('data-home-gallery="designer-toy"') &&
    galleryLib.includes("DESIGNER_TOY_GALLERY") &&
    galleryLib.includes("/style-studies/") &&
    galleryLib.includes("art-vinyl-guardian") &&
    galleryLib.includes('createGenerate360Href("home-gallery-pedestal")') &&
    !galleryLib.includes('href: "/effects/360-spin-showcase"') &&
    !galleryLib.includes("/demos/beatbot") &&
    !galleryLib.includes("/demos/orbit"),
  "designer gallery must use 潮玩 style-studies stills, not cartoon demo loops"
);
const homeTrust = read("components/HomeTrustFooter.tsx");
assert(
  homeTrust.includes('createGenerate360Href("home-trust")') &&
    homeTrust.includes('data-home-trust-generate="360"') &&
    homeTrust.includes("Generate 360° listing spin"),
  "home trust footer must expose one primary Generate→360 last-fold door"
);
const appShellProof = read("components/AppShell.tsx");
assert(
  appShellProof.includes('createGenerate360Href("app-shell-home")') &&
    appShellProof.includes('data-home-primary-nav={motionChrome ? "generate-360"') &&
    appShellProof.includes("href: HOME_SHELL_GENERATE_HREF") &&
    appShellProof.includes('label: "Generate"') &&
    /motionChrome\s*\?\s*HOME_SHELL_GENERATE_HREF\s*:\s*PRIMARY_NAV_CREATE_HREF/.test(
      appShellProof
    ) &&
    !/motionChrome\s*\?\s*DEFAULT_MOMENT_CREATE_HREF\s*:\s*PRIMARY_NAV_CREATE_HREF/.test(
      appShellProof
    ),
  "home shell primary nav must be Generate→360 (not Moment Create)"
);
assert(
  home.indexOf("<HomeCinemaHero") < home.indexOf("<HomeDesignerGallery") &&
    home.indexOf("<HomeDesignerGallery") < home.indexOf("<HomeTrustFooter"),
  "home order: gallery hero → designer gallery → trust footer"
);
// Secondary rails still exist for Explore/Lab surfaces (not mounted on home).
const exploreRail = read("components/HomeExploreRecipeRail.tsx");
assert(
  exploreRail.includes("createGenerate360Href") ||
    exploreRail.includes("HOME_PROOF"),
  "explore recipe rail module remains available off-home"
);
const homeRail = read("components/HfProductRail.tsx");
assert(
  homeRail.includes("createGenerate360Href") &&
    homeRail.includes("MOMENT_CREATE_HREF"),
  "HF product rail module keeps Generate/Moment href helpers"
);
assert(
  feed.includes("return buildHomeShowcaseFeed();"),
  "legacy viral-wall helper must stay capped to the homepage proof registry"
);
assert(
  !feed.includes("const demo = mapped ?? demoForIndex"),
  "concept recipes must not borrow another recipe video"
);
assert(
  tile.includes("data-concept-recipe-art") &&
    presetPreview.includes("data-concept-recipe-art"),
  "concept cards must render static recipe art"
);
assert(
  tile.includes('isConcept ? "View recipe notes →"') &&
    presetPreview.includes('"View recipe notes →"'),
  "concept cards must not present a Remake action"
);
assert(
  autoplay.includes('matchMedia("(max-width: 768px)").matches ? 1 : 2'),
  "autoplay budget must be 1 mobile / 2 desktop"
);
assert(
  autoplay.includes('data-video-controls="visible"') &&
    autoplay.includes("prefers-reduced-motion: reduce"),
  "featured video must expose controls and respect reduced motion"
);
assert(
  create.includes("<CreateStudio") &&
    create.includes('initialEffect="street-power-up"') &&
    create.includes("fixedMomentContract") &&
    !create.includes("BatchStudio") &&
    !create.includes("PrivateSellerPackGate") &&
    !create.includes("initialRecoverPackRunId") &&
    batch.includes("reserveSellerPackClient") &&
    batch.includes("parseExactSellerPackServerJobs") &&
    batch.includes("sellerPackQuoteLabel(packQuote)") &&
    !create.includes("Launch Pack — 12 recipes") &&
    !batch.includes("Launch Pack — 12 recipes"),
  "the fixed three-child Pack engine must stay private while Create remains one Moment"
);
assert(
  library.includes("fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })") &&
    library.includes("if (!me?.signedIn)") &&
    library.includes('fetch("/api/generations"') &&
    library.includes("body.jobs.filter(visibleAccountJob)") &&
    library.includes("if (job.demo) return false") &&
    library.includes("privateDownloadHeaders") &&
    library.includes("/api/downloads/") &&
    library.includes('method: "HEAD"') &&
    library.includes("interpretDownloadHead") &&
    library.includes("downloadVideoFile") &&
    library.includes("<video") &&
    library.includes("controls") &&
    library.includes("playsInline") &&
    library.includes("isRetryable(job.status)") &&
    library.includes("/api/generations/${encodeURIComponent(job.id)}/retry") &&
    library.includes("isOpen(job.status)") &&
    library.includes("/api/generations/${encodeURIComponent(job.id)}") &&
    !/data-library-seller-packs|Create new Pack|Try cached sample Pack|getSellerPackDiscoveryClient|Saved on this device|device-local|session-stills|\/api\/image/.test(
      library
    ),
  "Library must stay account-only with owner-gated video results, retry/cancel, and no Pack/demo grid"
);

// AIT-320: four-surface money path off residual competitor lime (board tokens)
{
  const lime = /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i;
  const fourSurface = {
    "components/HfProductRail.tsx": read("components/HfProductRail.tsx"),
    "components/HomeBrowseCta.tsx": read("components/HomeBrowseCta.tsx"),
    "components/HomeViralPresetRail.tsx": read("components/HomeViralPresetRail.tsx"),
    "components/HomeExploreRecipeRail.tsx": exploreRail,
    "components/CreateStudio.tsx": read("components/CreateStudio.tsx"),
    "components/LibraryGrid.tsx": library,
    "components/PricingHeroCopy.tsx": read("components/PricingHeroCopy.tsx"),
    "components/PricingPlanCards.tsx": read("components/PricingPlanCards.tsx"),
    "components/PricingUsageEstimator.tsx": read(
      "components/PricingUsageEstimator.tsx"
    ),
    "components/GuestMomentCreateGate.tsx": read(
      "components/GuestMomentCreateGate.tsx"
    ),
    // remount-ready (not mounted on / today; keep board-clean for north-star density)
    "components/HfExploreHome.tsx": read("components/HfExploreHome.tsx"),
  };
  for (const [rel, src] of Object.entries(fourSurface)) {
    assert(
      !lime.test(src),
      `${rel} must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)`
    );
  }
  assert(
    fourSurface["components/HfProductRail.tsx"].includes("var(--neon-pink)") &&
      fourSurface["components/LibraryGrid.tsx"].includes("var(--neon-pink)") &&
      fourSurface["components/HomeBrowseCta.tsx"].includes("var(--neon-pink)") &&
      fourSurface["components/HomeExploreRecipeRail.tsx"].includes(
        "var(--neon-pink)"
      ),
    "Home rails + Library + browse CTA use neon-pink board tokens"
  );
  assert(
    fourSurface["components/CreateStudio.tsx"].includes("rgba(255,78,205") &&
      fourSurface["components/PricingPlanCards.tsx"].includes(
        "rgba(255,78,205"
      ) &&
      fourSurface["components/PricingUsageEstimator.tsx"].includes(
        "rgba(255,78,205"
      ),
    "Create + Pricing glows use neon-pink rgba board tokens"
  );
}

// AIT-517: shell chrome residual carnival/lime → gallery-calm copper board
{
  const carnival =
    /#B14EFF|#FF4ECD|255\s*,\s*78\s*,\s*205|177\s*,\s*78\s*,\s*255/i;
  const lime = /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i;
  const button = read("components/ui/button.tsx");
  const softLaunch = read("components/SoftLaunchStrip.tsx");
  assert(
    !carnival.test(appShellProof),
    "components/AppShell.tsx must not hard-code carnival neon"
  );
  assert(
    !carnival.test(button),
    "components/ui/button.tsx must not hard-code carnival neon"
  );
  assert(
    !lime.test(softLaunch),
    "SoftLaunchStrip must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert(
    appShellProof.includes("var(--grad-cta)") &&
      appShellProof.includes("var(--brand)") &&
      /rgba\(196\s*,\s*165\s*,\s*116/.test(appShellProof),
    "AppShell CTAs/rails use --grad-cta / --brand + copper glow"
  );
  assert(
    button.includes("var(--grad-cta)") &&
      button.includes("rgba(196,165,116") &&
      button.includes("var(--primary-foreground)"),
    "ui/button default CTA uses --grad-cta + copper glow + primary-foreground"
  );
  assert(
    softLaunch.includes("var(--brand)") &&
      /rgba\(196\s*,\s*165\s*,\s*116/.test(softLaunch),
    "SoftLaunchStrip chips/CTAs use --brand + copper glow"
  );
}

// AIT-577: Explore discovery page residual competitor lime → gallery-calm copper
{
  const lime = /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i;
  const explorePage = read("app/explore/page.tsx");
  assert(
    !lime.test(explorePage),
    "app/explore/page.tsx must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert(
    explorePage.includes("var(--brand)"),
    "Explore page eyebrows/CTAs/path accents use --brand copper"
  );
}

// AIT-585: Project detail residual competitor lime → gallery-calm copper
{
  const lime = /#c8ff3d|c8ff3d|200\s*,\s*255\s*,\s*61/i;
  const projectPage = read("app/projects/[slug]/page.tsx");
  assert(
    !lime.test(projectPage),
    "app/projects/[slug]/page.tsx must not hard-code competitor lime (#c8ff3d / rgba 200,255,61)"
  );
  assert(
    projectPage.includes("var(--brand)") &&
      projectPage.includes("var(--grad-cta)") &&
      projectPage.includes("var(--primary-foreground)") &&
      /rgba\(196\s*,\s*165\s*,\s*116/.test(projectPage),
    "Project detail uses --brand / --grad-cta / --primary-foreground + copper glow"
  );
}

console.log(
  `product-proof smoke passed: ${proofSlugs.length} proof recipes, static concepts, 1/2 autoplay budget`
);
