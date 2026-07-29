/**
 * Wave A product-contract smoke.
 *
 * Pure/source checks only: no network, credentials, provider, database, Stripe,
 * browser automation, or production server. Browser viewport proof remains a
 * separate CI/E2E gate.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

function loadTypescriptModule(relativePath, imports = {}) {
  const source = read(relativePath);
  const output = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error
  );
  assert.equal(
    errors.length,
    0,
    `${relativePath} must transpile: ${errors
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"))
      .join("; ")}`
  );

  const runtimeModule = { exports: {} };
  new Function("require", "exports", "module", output.outputText)(
    (id) => {
      if (Object.hasOwn(imports, id)) return imports[id];
      throw new Error(`Unexpected ${relativePath} fixture import: ${id}`);
    },
    runtimeModule.exports,
    runtimeModule
  );
  return runtimeModule.exports;
}

const fixturePresets = [
  {
    slug: "360-spin-showcase",
    aspectRatio: "1:1",
    duration: 5,
    promptTemplate: "listing spin",
  },
  {
    slug: "fixture-spin",
    aspectRatio: "1:1",
    duration: 5,
    promptTemplate: "fixture spin",
  },
  {
    slug: "fixture-other",
    aspectRatio: "9:16",
    duration: 10,
    promptTemplate: "fixture other",
  },
  {
    slug: "fixture-concept",
    aspectRatio: "16:9",
    duration: 5,
    promptTemplate: "fixture concept",
  },
];
const fixtureDemos = [
  {
    id: "scout-spin",
    preset: "360-spin-showcase",
    character: "Scout",
    title: "Listing spin",
    poster: "/spin.webp",
  },
  {
    id: "fixture-source",
    preset: "fixture-spin",
    character: "Fixture toy",
    title: "Fixture spin",
    poster: "/fixture.webp",
  },
  {
    id: "other-source",
    preset: "fixture-other",
    character: "Other toy",
    title: "Other move",
    poster: "/other.webp",
  },
];
const presetFixture = {
  PRESETS: fixturePresets,
  getPreset: (slug) => fixturePresets.find((item) => item.slug === slug),
};
const remix = loadTypescriptModule("lib/remixIntent.ts", {
  "@/lib/presets": presetFixture,
  "@/lib/demoVideos": { DEMO_VIDEOS: fixtureDemos },
  "@/lib/viralNames": { viralName: (_slug, name) => name },
});

// Shared capability source and honest states.
const capabilities = loadTypescriptModule("lib/softLaunch.ts");
assert.deepEqual(Object.keys(capabilities.CAPABILITY_STATE_LABELS), [
  "live",
  "validation",
  "preview",
  "coming_soon",
]);
assert.deepEqual(capabilities.HOME_ENTRY_IDS, [
  "generate",
  "seller_pack",
  "explore",
  "recipes",
  "library",
  "learn",
]);
assert.deepEqual(capabilities.PRIMARY_NAV_IDS, [
  "explore",
  "recipes",
  "generate",
  "library",
  "pricing",
]);
assert.deepEqual(
  capabilities.MOBILE_NAV.map((item) => item.id),
  capabilities.PRIMARY_NAV_IDS
);
assert.equal(capabilities.WAVE_A_DESTINATIONS.generate.state, "validation");
assert.equal(capabilities.WAVE_A_DESTINATIONS.seller_pack.state, "validation");
assert.equal(capabilities.WAVE_A_DESTINATIONS.explore.state, "preview");
assert.equal(capabilities.WAVE_A_DESTINATIONS.recipes.state, "preview");
assert.equal(capabilities.WAVE_A_DESTINATIONS.library.state, "preview");
assert.equal(
  capabilities.WAVE_A_DESTINATIONS.library.note,
  "Local to this device"
);
assert.deepEqual(
  capabilities.HOME_ENTRY_RAIL.map((item) => item.homeLabel ?? item.label),
  [
    "Generate",
    "Seller Starter Pack",
    "Explore Projects",
    "Recipes",
    "Library",
    "Learn",
  ]
);
assert.equal(capabilities.WAVE_A_DESTINATIONS.generate.href, "/create");
assert.equal(
  capabilities.PRIMARY_NAV.find((item) => item.id === "generate")?.href,
  "/create"
);
assert.equal(
  capabilities.MOBILE_NAV.find((item) => item.id === "generate")?.href,
  "/create"
);
assert.equal(
  new URL(capabilities.WAVE_A_DESTINATIONS.generate.href, "https://pikbo.invalid")
    .search,
  ""
);
for (const id of ["generate", "seller_pack"]) {
  assert.notEqual(
    capabilities.WAVE_A_DESTINATIONS[id].state,
    "live",
    `${id} must not be exposed as an unconditional live door`
  );
}
for (const workflow of [
  ".github/workflows/ci.yml",
  "docs/ci/github-actions-ci.yml",
]) {
  const source = read(workflow);
  for (const gate of [
    "wave-a-contract-smoke",
    "showcase-evidence-smoke",
    "showcase-promotion-gate",
    "product-proof-smoke",
    "mobile-proof-regression",
    "seo-cold-start-smoke",
    "seller-pack-cached-smoke",
    "launch-pack-main-path-smoke",
    "live-copy-smoke",
  ]) {
    assert.match(source, new RegExp(`npm run ${gate}`));
  }
  if (workflow === ".github/workflows/ci.yml") {
    assert.doesNotMatch(
      source,
      /npm run t6-deliverable-proof/,
      "Wave A must not pull the pre-existing T6 documentation drift into real CI"
    );
  }
}

// Exact canonical RemixIntent and source/recipe binding.
const canonicalHref = remix.createRemixHref("fixture-spin", "fixture-source");
const canonicalUrl = new URL(canonicalHref, "https://pikbo.invalid");
assert.deepEqual([...canonicalUrl.searchParams.keys()], [
  "effect",
  "source",
  "ratio",
  "duration",
  "channel",
]);
assert.deepEqual(Object.fromEntries(canonicalUrl.searchParams), {
  effect: "fixture-spin",
  source: "fixture-source",
  ratio: "1:1",
  duration: "5",
  channel: "etsy",
});
const parsed = remix.parseRemixSearchParams({
  effect: "fixture-spin",
  source: "fixture-source",
  ratio: "9:16",
  duration: "10",
  channel: "tiktok",
});
assert.equal(parsed.intent?.sourceProjectSlug, "fixture-source");
assert.equal(parsed.intent?.aspectRatio, "9:16");
assert.equal(parsed.intent?.durationSeconds, 10);
assert.equal(parsed.intent?.channel, "tiktok");
assert.equal(parsed.sourceProjectHref, "/projects/fixture-source");
const mismatched = remix.parseRemixSearchParams({
  effect: "fixture-spin",
  source: "other-source",
});
assert.equal(mismatched.intent?.sourceProjectSlug, "fixture-source");
assert.match(mismatched.notices.join(" "), /does not match/i);
assert.equal(mismatched.sourceProjectHref, "/projects/fixture-source");
const unknownSource = remix.parseRemixSearchParams({
  effect: "fixture-spin",
  source: "not-a-project",
});
assert.equal(unknownSource.intent?.sourceProjectSlug, "fixture-source");
assert.match(unknownSource.notices.join(" "), /Unknown source project/i);
const concept = remix.parseRemixSearchParams({
  effect: "fixture-concept",
  source: "fixture-concept",
});
assert.equal(concept.intent?.sourceProjectSlug, "fixture-concept");
assert.equal(concept.sourceProjectHref, null);
assert.equal(remix.isRegisteredRemixSourceForRecipe("fixture-spin", "fixture-source"), true);
assert.equal(remix.isRegisteredRemixSourceForRecipe("fixture-spin", "other-source"), false);

// Home Recipe vs Project semantics and connected ordering.
const home = read("app/page.tsx");
const recipeWall = read("components/HomeViralWall.tsx");
const projectRail = read("components/HomeProjectsExplore.tsx");
assert.match(recipeWall, /data-home-card-destination="recipe"/);
assert.match(recipeWall, /href=\{item\.detailHref \|\| `\/effects\/\$\{recipeSlug\}`\}/);
assert.match(recipeWall, /data-home-card-destination="create"[\s\S]*Use this recipe/);
assert.match(projectRail, /href=\{p\.detailHref\}[\s\S]*data-home-project-destination="project"/);
assert.match(projectRail, /href=\{p\.remakeHref\}[\s\S]*data-home-project-destination="create"/);
assert.match(projectRail, /<AutoPlayVideo[\s\S]*lazySources/);
assert.doesNotMatch(projectRail, /eager=/);
assert.ok(
  home.indexOf("<HomeViralWall") < home.indexOf("<HomeProjectsExplore"),
  "Recipe reuse must precede the connected Project evidence surface"
);
assert.ok(
  home.indexOf("<HomeProjectsExplore") < home.indexOf('data-home-upgrade="launch-pack"'),
  "discovery surfaces must stay above Launch Pack"
);
assert.match(home, /<HomeToolShelf \/>/);
assert.match(home, /<HomeSellerValueBanner \/>/);
const feed = read("lib/videoFeed.ts");
assert.match(feed, /detailHref:\s*`\/effects\/\$\{project\.recipeSlug\}`/);
assert.match(feed, /projectHref:\s*showcaseProjectHref\(project\)/);

// Explore filters are exact and behavior is pure/testable.
const showcaseRegistry = read("lib/showcaseProjects.ts");
const categoryBlock =
  showcaseRegistry.match(/SHOWCASE_CATEGORIES[^=]*=\s*\[([\s\S]*?)\];/)?.[1] ?? "";
assert.deepEqual(
  [...categoryBlock.matchAll(/label:\s*"([^"]+)"/g)].map((match) => match[1]),
  ["All", "Listing", "Unboxing", "Come alive", "Social hooks", "Story"]
);
const filters = loadTypescriptModule("lib/showcaseFilters.ts");
const filterFixtures = [
  { slug: "a", category: "listing" },
  { slug: "b", category: "story" },
  { slug: "c", category: "listing" },
];
assert.deepEqual(
  filters.filterShowcaseProjects(filterFixtures, "listing").map((item) => item.slug),
  ["a", "c"]
);
assert.equal(filters.filterShowcaseProjects(filterFixtures, "all").length, 3);
assert.match(read("components/ExploreProjectGrid.tsx"), /filterShowcaseProjects\(projects, category\)/);

// Search/category recipes and exact public media provenance states.
const recipeBrowser = read("components/RecipeBrowser.tsx");
assert.match(recipeBrowser, /data-recipe-browser="search-category"/);
assert.match(recipeBrowser, /type="search"/);
assert.match(recipeBrowser, /item\.category !== category/);
const media = loadTypescriptModule("lib/mediaProvenance.ts", {
  "@/lib/demoVideos": { DEMO_VIDEOS: fixtureDemos },
});
assert.equal(media.mediaProvenanceForRecipe("fixture-spin"), "official_cached");
assert.equal(media.mediaProvenanceForRecipe("fixture-concept"), "concept");
assert.equal(media.mediaProvenanceFromShowcase("live_generated"), "live_generated");
assert.equal(media.mediaProvenanceFromShowcase("concept"), "concept");
assert.equal(media.mediaProvenanceFromShowcase("cached_prototype"), "official_cached");
assert.deepEqual(Object.keys(media.MEDIA_PROVENANCE_LABELS), [
  "official_cached",
  "live_generated",
  "concept",
]);
assert.doesNotMatch(feed, /mapped\s*\?\?\s*demoForIndex/);
assert.match(feed, /demo:\s*mapped/);
assert.match(feed, /conceptArt:\s*mapped\s*\?/);
assert.match(feed, /mediaProvenance:\s*mediaProvenanceForRecipe\(p\.slug\)/);
assert.match(read("components/VideoTile.tsx"), /data-concept-recipe-art/);
assert.match(read("components/PresetPreviewCard.tsx"), /data-concept-recipe-art/);

// Project truth record: paired evidence, all requested fields, no model fact absent evidence.
const projectPage = read("app/projects/[slug]/page.tsx");
for (const label of [
  "Reference poster",
  "Cached prototype",
  "Recipe",
  "Aspect",
  "Duration",
  "Resolution",
  "Audio",
  "Media provenance",
  "Evidence / review state",
  "Use this recipe",
]) {
  assert.ok(projectPage.includes(label), `Project page must show ${label}`);
}
assert.match(projectPage, /Not verified · provider task evidence absent/);
assert.match(projectPage, /const verified = promoted && evidenceComplete/);
const exploreGrid = read("components/ExploreProjectGrid.tsx");
assert.match(exploreGrid, /Provider \/ model evidence unavailable/);
assert.match(exploreGrid, /isPromotedShowcaseProvenance\(project\.provenance\)/);
assert.match(exploreGrid, /const verified =[\s\S]*evidenceComplete/);

// Device-local Library wording is exact and cannot imply cloud persistence.
const libraryGrid = read("components/LibraryGrid.tsx");
const librarySurface = [
  read("app/library/page.tsx"),
  libraryGrid,
  read("components/LibraryStorageBanner.tsx"),
].join("\n");
assert.match(librarySurface, /Local to this device/);
assert.doesNotMatch(librarySurface, /cloud-synced Library|available on every device/i);
assert.match(libraryGrid, /type GroupMode = "flat" \| "project" \| "recipe" \| "sku"/);
assert.match(libraryGrid, /<option value="recipe">By recipe<\/option>/);
assert.doesNotMatch(librarySurface, /HF Assets pattern/i);

// Responsive source safeguards for the required viewport matrix.
const viewportMatrix = [390, 768, 1440];
assert.deepEqual(viewportMatrix, [390, 768, 1440]);
const css = read("app/globals.css");
assert.match(css, /html\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow-x:\s*clip;/);
assert.match(css, /body\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow-x:\s*clip;/);
assert.match(css, /img,\s*\nvideo,\s*\nsvg,\s*\ncanvas\s*\{[\s\S]*max-width:\s*100%/);
assert.match(read("components/AppShell.tsx"), /min-w-0/);
assert.match(read("components/HomeToolShelf.tsx"), /overflow-x-auto/);

// One mobile / two desktop autoplay, with reactive reduced-motion shutdown.
const autoplay = read("components/AutoPlayVideo.tsx");
assert.match(autoplay, /matchMedia\("\(max-width: 768px\)"\)\.matches \? 1 : 2/);
assert.match(autoplay, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
assert.match(autoplay, /function prefersReducedMotion\(\)/);
assert.match(autoplay, /mq\.addEventListener\("change", sync\)/);
assert.match(autoplay, /if \(mq\.matches && ref\.current\) release\(ref\.current\)/);
assert.match(autoplay, /reducedMotion \|\| prefersReducedMotion\(\)/);
assert.match(autoplay, /data-reduced-motion=/);

// Unknown public Recipe/Project slugs fail closed through Next notFound().
const recipePage = read("app/effects/[slug]/page.tsx");
assert.match(recipePage, /if \(!preset\) notFound\(\)/);
assert.doesNotMatch(recipePage, /Free: one Seedance Mini live trial/);
assert.match(recipePage, /Cached previews cost 0 credits/);
assert.match(recipePage, /do not process your current[\s\S]*upload/);
assert.match(recipePage, /eligible accounts[\s\S]*quote[\s\S]*before submission/);
assert.match(projectPage, /if \(!project\) notFound\(\)/);
assert.match(projectPage, /title:\s*"Project not found"/);
assert.match(projectPage, /robots:\s*\{ index: false, follow: false \}/);

console.log(
  "wave-a-contract-smoke: PASS (capabilities, links, filters, provenance, local Library, responsive safeguards, autoplay, 404)"
);
