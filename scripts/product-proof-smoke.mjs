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
assert(
  home.includes("<HomeCinemaHero />") &&
    homeHero.includes('data-home-hero="street-power-up"') &&
    homeHero.includes("href={MOMENT_CREATE_HREF}") &&
    homeHero.includes("Sample · Beatbot") &&
    homeHero.includes("Create my drop clip") &&
    homeHero.includes("data-home-moment-cta") &&
    (homeHero.match(/data-home-moment-cta/g) || []).length === 1 &&
    homeHero.includes("Sample shown: cached 6s archive") &&
    homeHero.includes("not a completed customer deliverable") &&
    homeHero.includes("not your toy") &&
    home.includes("<HomeViralWall") &&
    home.includes("<HomeExploreRecipeRail") &&
    home.includes("<HfProductRail") &&
    home.includes("buildHomeShowcaseFeed") &&
    !home.includes("PublicLaunchPackSample") &&
    !home.includes('from "@/components/HfExploreHome"') &&
    !home.includes("<HfExploreHome") &&
    (moments.match(/evidence: "Official Concept",/g) || []).length === 6,
  "homepage must expose Moment hero + Lab proof wall + explore recipe rail + HF product rail (no Pack / full Explore remount)"
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
const homeWall = read("components/HomeViralWall.tsx");
assert(
  homeWall.includes("HOME_PROOF_BADGE") &&
    homeWall.includes("home-proof-wall") &&
    homeWall.includes("data-home-proof-360") &&
    homeWall.includes("pinListing360InFirstSlots") &&
    homeWall.includes("data-home-proof-360-pinned") &&
    homeWall.includes("createGenerate360Href") &&
    (homeWall.includes("HOME_PROOF_LIMIT") ||
      homeWall.includes(".slice(0, 8)")),
  "Lab proof wall must badge honestly, pin 360, use createGenerate360Href, cap ≤8"
);
// CTA hierarchy: Moment primary in hero → wall → thin explore rail → suite rail.
assert(
  home.indexOf("<HomeCinemaHero") < home.indexOf("<HomeViralWall") &&
    home.indexOf("<HomeViralWall") < home.indexOf("<HomeExploreRecipeRail") &&
    home.indexOf("<HomeExploreRecipeRail") < home.indexOf("<HfProductRail") &&
    home.indexOf("<HfProductRail") < home.indexOf("<HomeTrustFooter"),
  "home order: Moment hero → proof wall → explore recipe rail → HF product rail → trust footer"
);

// AIT-156/AIT-166: thin Lab recipe rail — secondary Remake + one-tap 360 workbench.
const exploreRail = read("components/HomeExploreRecipeRail.tsx");
assert(
  exploreRail.includes('data-home-explore-rail="lab"') &&
    exploreRail.includes('data-home-explore-rail="empty"') &&
    exploreRail.includes("createGenerate360Href") &&
    exploreRail.includes("HOME_PROOF_BADGE") &&
    exploreRail.includes("home-explore-rail") &&
    exploreRail.includes("home_explore_rail_remake") &&
    exploreRail.includes("Lab recipe previews unavailable") &&
    exploreRail.includes("data-home-explore-rail-360-direct") &&
    exploreRail.includes("pinListing360First") &&
    /is360\s*\?\s*listing360Href/.test(exploreRail) &&
    exploreRail.includes("Generate 360°") &&
    !exploreRail.includes("data-home-moment-cta") &&
    !exploreRail.includes("MOMENT_CREATE_HREF") &&
    !exploreRail.includes("Create my drop clip") &&
    !exploreRail.includes("Create a Moment") &&
    (exploreRail.includes("RAIL_LIMIT") ||
      exploreRail.includes(".slice(0, 8)") ||
      exploreRail.includes("HOME_PROOF_LIMIT")),
  "explore recipe rail must be Lab-only, honest-empty, 1-click 360 workbench (no Moment primary)"
);

// Suite rail: Generate via createGenerate360Href + Moment via MOMENT_CREATE_HREF.
const homeRail = read("components/HfProductRail.tsx");
assert(
  homeRail.includes("createGenerate360Href") &&
    homeRail.includes('"hf-product-rail"') &&
    homeRail.includes("MOMENT_CREATE_HREF") &&
    homeRail.includes("source=hf-product-rail") &&
    homeRail.includes('data-home-suite-rail="hf-product"') &&
    homeRail.includes("data-home-suite-360") &&
    !homeRail.includes('"/create?effect=street-power-up"') &&
    !homeRail.includes('"/create"'),
  "HF product rail: Generate via createGenerate360Href + Moment via MOMENT_CREATE_HREF (no bare /create)"
);
assert(
  homeWall.includes('createGenerate360Href("home-proof-wall")') ||
    homeWall.includes("createGenerate360Href('home-proof-wall')"),
  "proof wall Listing 360 must tag source=home-proof-wall"
);
// AIT-160: proof wall one primary Generate→360 (not Moment-first on the wall).
assert(
  homeWall.includes('data-home-primary-generate="360"') &&
    homeWall.includes("data-home-primary-generate-cta") &&
    homeWall.includes("data-home-proof-360-direct") &&
    homeWall.includes("Generate 360°") &&
    homeWall.includes('createGenerate360Href("home-proof-wall")') &&
    homeWall.includes("listing360Href") &&
    /is360\s*\?\s*listing360Href/.test(homeWall),
  "home proof wall must expose one primary Generate→360 door and 1-click 360 card"
);
// Wall primary Generate CTA before secondary Moment (desktop header block).
{
  const genIdx = homeWall.indexOf("data-home-primary-generate-cta");
  const momentLabelIdx = homeWall.indexOf("Create a Moment");
  assert(
    genIdx > 0 && momentLabelIdx > genIdx,
    "proof wall must render primary Generate CTA before secondary Moment label"
  );
}
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
  library.includes("fetchMe()") &&
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

console.log(
  `product-proof smoke passed: ${proofSlugs.length} proof recipes, static concepts, 1/2 autoplay budget`
);
