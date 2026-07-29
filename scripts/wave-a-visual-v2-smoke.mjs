import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const heroDesktop = "public/demos/visual-v2/hero-desktop.webp";
const heroMobile = "public/demos/visual-v2/hero-mobile.webp";
const heroLoop = "public/demos/visual-v2/hero-loop.mp4";
const proofAssets = [
  "hero-input.webp",
  "hero-set.webp",
  "hero-output.webp",
].map((name) => `public/demos/visual-v2/${name}`);
const recipeSlugs = [
  "floating-hero",
  "blind-box-unboxing",
  "miniature-scene",
  "paparazzi-flash",
  "360-spin-showcase",
  "mystery-box-reveal",
  "make-figure-dance",
  "display-case-glam",
];
const recipeAssets = recipeSlugs.map(
  (slug) => `public/demos/visual-v2/recipes/${slug}.webp`
);

assert.ok(statSync(join(root, heroDesktop)).size <= 300_000);
assert.ok(statSync(join(root, heroMobile)).size <= 150_000);
assert.ok(statSync(join(root, heroLoop)).size <= 1_500_000);
for (const file of [...proofAssets, ...recipeAssets]) {
  assert.ok(statSync(join(root, file)).size <= 250_000, `${file} exceeds budget`);
}

const hero = read("components/HomeCinemaHero.tsx");
const wall = read("components/HomeViralWall.tsx");
const autoplay = read("components/AutoPlayVideo.tsx");
const demoVideos = read("lib/demoVideos.ts");
const samples = read("lib/samples.ts");
const recipeArt = read("lib/recipeArt.ts");
const workflow = read(".github/workflows/ci.yml");
const page = read("app/page.tsx");

assert.match(hero, /data-home-hero="proof-story"/);
assert.match(hero, /Original editorial input/);
assert.match(hero, /Editorial process view/);
assert.match(hero, /Cached editorial preview/);
assert.match(hero, /event:\s*"landing_view"/);
assert.doesNotMatch(hero, /recipe_use|data-hero-recipe/);
assert.match(hero, /mobilePlayback="poster-only"/);
assert.match(hero, /mobilePoster="\/demos\/visual-v2\/hero-mobile\.webp"/);
assert.match(page, /hero-mobile\.webp[\s\S]*max-width: 768px/);
assert.match(page, /hero-desktop\.webp[\s\S]*min-width: 769px/);

assert.match(wall, /Editorial recipe art/);
assert.match(wall, /Cached proof · Inside project/);
assert.match(wall, /data-home-card-destination="project"/);
assert.match(wall, /href=\{item\.href\}[\s\S]*Use this recipe/);
assert.doesNotMatch(wall, /<AutoPlayVideo/);

assert.match(autoplay, /mobilePlayback\?: "viewport" \| "poster-only"/);
assert.match(autoplay, /data-mobile-playback=\{mobilePlayback\}/);
assert.match(autoplay, /if \(mobilePosterOnly\)/);
assert.match(autoplay, /prefers-reduced-motion: reduce/);

for (const expected of [
  "/demos/orbit-still.webp",
  "/demos/moon-float.webp",
  "/demos/scout-still.webp",
  "/demos/beatbot-still.webp",
]) {
  assert.ok(demoVideos.includes(expected), `${expected} missing from projects`);
  assert.ok(samples.includes(expected), `${expected} missing from Create samples`);
}
assert.doesNotMatch(demoVideos, /poster:\s*"\/demos\/inputs\//);
assert.doesNotMatch(samples, /path:\s*"\/demos\/inputs\//);

for (const slug of recipeSlugs) {
  assert.ok(recipeArt.includes(slug), `${slug} missing from art registry`);
}
assert.match(recipeArt, /HOME_ART_DIR = "\/demos\/visual-v2\/recipes"/);
assert.match(workflow, /branches:\s*\[main, agent\/gpt\/higgsfield-wave-a\]/);

console.log(
  `wave-a-visual-v2-smoke: PASS (${recipeAssets.length} unified Recipe covers; mobile ${statSync(join(root, heroMobile)).size} B; desktop ${statSync(join(root, heroDesktop)).size} B)`
);
