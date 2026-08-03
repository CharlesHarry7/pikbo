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
const hfExplore = read("components/HfExploreHome.tsx");
const moments = read("lib/moments.ts");
const softLaunch = read("lib/softLaunch.ts");
const feed = read("lib/videoFeed.ts");
const tile = read("components/VideoTile.tsx");
const presetPreview = read("components/PresetPreviewCard.tsx");
const autoplay = read("components/AutoPlayVideo.tsx");
const create = read("app/create/page.tsx");
const batch = read("components/BatchStudio.tsx");
const privateSellerPackGate = read("components/PrivateSellerPackGate.tsx");
const appShell = read("components/AppShell.tsx");

const proofList =
  softLaunch.match(/HOME_PROOF_SLUGS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ??
  "";
const proofSlugs = [...proofList.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

assert(proofSlugs.length === 8, "homepage proof whitelist must contain exactly 8 recipes");
// North star: 潮玩版 Higgsfield — Explore suite home (video wall + Generate),
// not a light marketing archive landing.
assert(
  home.includes("HfExploreHome") &&
    home.includes("buildHomeShowcaseFeed") &&
    home.includes("buildViralPresetsWallFeed") &&
    hfExplore.includes("HomeViralWall") &&
    hfExplore.includes("HfProductRail") &&
    hfExplore.includes("HfPromoCampaignStrip") &&
    softLaunch.includes('label: "Generate"') &&
    softLaunch.includes('label: "Explore"') &&
    appShell.includes("momentSurface = momentCreate") &&
    (moments.match(/evidence: "Official Concept",/g) || []).length === 6,
  "homepage must be HF-class Explore suite (viral wall + Generate chrome)"
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
  create.includes("Prepare a private Launch Pack.") &&
    create.includes("<PrivateSellerPackGate>") &&
    privateSellerPackGate.includes("canUsePrivateLaunch(me)") &&
    privateSellerPackGate.includes("router.replace(PUBLIC_MOMENT_HREF)") &&
    batch.includes("reserveSellerPackClient") &&
    batch.includes("parseExactSellerPackServerJobs") &&
    batch.includes("sellerPackQuoteLabel(packQuote)") &&
    !create.includes("Launch Pack — 12 recipes") &&
    !batch.includes("Launch Pack — 12 recipes"),
  "the fixed three-child Pack engine must stay private while public creation remains one Moment"
);

console.log(
  `product-proof smoke passed: ${proofSlugs.length} proof recipes, static concepts, 1/2 autoplay budget`
);
