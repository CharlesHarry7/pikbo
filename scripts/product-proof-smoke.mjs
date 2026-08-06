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
    home.includes("<HomeMomentShowcase") &&
    home.includes("<HfProductRail") &&
    home.includes("buildHomeShowcaseFeed") &&
    !home.includes("PublicLaunchPackSample") &&
    !home.includes('from "@/components/HfExploreHome"') &&
    !home.includes("<HfExploreHome") &&
    (moments.match(/evidence: "Official Concept",/g) || []).length === 6,
  "homepage must expose Moment hero + Lab proof wall + Moment showcase + HF product rail (no Pack / full Explore remount)"
);
const homeShowcase = read("components/HomeMomentShowcase.tsx");
assert(
  homeShowcase.includes("data-home-moment-showcase") &&
    homeShowcase.includes("MOMENT_CREATE_HREF") &&
    homeShowcase.includes("source=home-moment-showcase") &&
    homeShowcase.includes("/create?moment=capsule-reveal") &&
    homeShowcase.includes("data-concept-preview") &&
    homeShowcase.includes("data-live-gated"),
  "HomeMomentShowcase must ship dual-door concept + Live-gated honesty markers"
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
// CTA hierarchy: Moment primary in hero, then wall, then concept archive, then suite rail.
assert(
  home.indexOf("<HomeCinemaHero") < home.indexOf("<HomeViralWall") &&
    home.indexOf("<HomeViralWall") < home.indexOf("<HomeMomentShowcase") &&
    home.indexOf("<HomeMomentShowcase") < home.indexOf("<HfProductRail") &&
    home.indexOf("<HfProductRail") < home.indexOf("<HomeTrustFooter"),
  "home order: Moment hero → proof wall → Moment showcase → HF product rail → trust footer"
);

// AIT-220: one above-fold primary Moment CTA (hero only). Mid-page dual doors
// + Generate→360 wall/rail helpers stay secondary — no triple-primary stack.
const homeWallSrc = homeWall;
const homeShowcaseSrc = homeShowcase;
const homeRail = read("components/HfProductRail.tsx");
const countMarker = (src, marker) => (src.match(new RegExp(marker, "g")) || []).length;

// Attribute form only (ignore prose comments that may mention the marker name).
const primaryAttr = /data-home-moment-cta(?:=|\s|>|\/)/;
assert(
  countMarker(homeHero, "data-home-moment-cta") === 1 &&
    primaryAttr.test(homeHero) &&
    !primaryAttr.test(homeWallSrc) &&
    !primaryAttr.test(homeShowcaseSrc) &&
    !primaryAttr.test(homeRail),
  "exactly one above-fold primary Moment CTA (data-home-moment-cta on hero only)"
);
assert(
  countMarker(homeShowcaseSrc, "data-real-moment-cta") === 1 &&
    countMarker(homeShowcaseSrc, "data-moment-create-cta") === 1 &&
    homeShowcaseSrc.includes('data-home-showcase-doors="secondary"') &&
    homeShowcaseSrc.includes('data-home-showcase-door="concept"') &&
    homeShowcaseSrc.includes('data-home-showcase-door="live-gated"') &&
    !homeShowcaseSrc.includes("bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)]") &&
    !/rounded-full bg-\[#171719\]/.test(homeShowcaseSrc),
  "showcase dual doors stay mid-page secondary (markers + no filled primary chrome)"
);
assert(
  homeWallSrc.includes("createGenerate360Href") &&
    countMarker(homeWallSrc, "data-home-proof-360-cta") >= 1 &&
    homeRail.includes("createGenerate360Href") &&
    homeRail.includes('data-hf-rail-generate="remix"'),
  "Generate→360 remains secondary via wall/rail helpers (not hero primary)"
);
// AIT-234: wall remake chips + Create doors stay outline secondary — never
// hero-grade gradient fill competing with data-home-moment-cta.
assert(
  homeWallSrc.includes('data-home-wall-remake="secondary"') &&
    homeWallSrc.includes("Try this recipe") &&
    !homeWallSrc.includes("bg-[linear-gradient(135deg,#B14EFF,#FF4ECD)]") &&
    !homeWallSrc.includes("shadow-[0_0_18px_rgba(255,78,205,0.35)]") &&
    homeWallSrc.includes('data-home-wall-create="secondary"') &&
    homeWallSrc.includes('data-home-wall-360="secondary"') &&
    homeWallSrc.includes("HOME_PROOF_BADGE") &&
    homeWallSrc.includes("createGenerate360Href"),
  "wall remake chips secondary (outline weight); Create/360 doors secondary; honesty + 360 href preserved"
);
// AIT-244: AppShell Home header Create is secondary chrome when hero owns primary.
const shellSrc = read("components/AppShell.tsx");
assert(
  // JSX: data-shell-home-create={home ? "secondary" : undefined} × desktop+mobile
  (shellSrc.match(
    /data-shell-home-create=\{home\s*\?\s*["']secondary["']\s*:\s*undefined\}/g
  ) || []).length === 2 &&
    shellSrc.includes('data-shell-create-surface="desktop"') &&
    shellSrc.includes('data-shell-create-surface="mobile"') &&
    shellSrc.includes("Try Street Power-Up") &&
    shellSrc.includes("Create my drop clip") &&
    shellSrc.includes("DEFAULT_MOMENT_CREATE_HREF") &&
    shellSrc.includes(
      "const DEFAULT_MOMENT_CREATE_HREF = `${MOMENT_CREATE_HREF}&source=moment-shell`"
    ) &&
    // Home arm is outline (border + transparent), not hero-grade fill.
    /home\s*\?\s*["']border border-white\/25 bg-transparent/.test(shellSrc) &&
    // Non-home moment / result shell may keep filled Create.
    shellSrc.includes("Create a Moment") &&
    shellSrc.includes("Use this motion"),
  "shell home Create secondary when hero owns primary; DEFAULT_MOMENT_CREATE_HREF honesty"
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
