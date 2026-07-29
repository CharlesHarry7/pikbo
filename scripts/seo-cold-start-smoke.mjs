/**
 * Phase H — cold-start index allowlist honesty.
 * WorkBuddy five-page marketing budget + legal (privacy/terms).
 * Run: npm run seo-cold-start-smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const seoIndex = readFileSync(join(root, "lib/seoIndex.ts"), "utf8");
const sitemap = readFileSync(join(root, "app/sitemap.ts"), "utf8");
const releaseDoc = readFileSync(
  join(root, "docs/growth/SEO_INDEXABLE_10_RELEASE.md"),
  "utf8"
);
const siteSrc = readFileSync(join(root, "lib/site.ts"), "utf8");
const layoutSrc = readFileSync(join(root, "app/layout.tsx"), "utf8");
const homeSrc = readFileSync(join(root, "app/page.tsx"), "utf8");
const toolPageSrc = readFileSync(
  join(root, "app/tools/[slug]/page.tsx"),
  "utf8"
);
const jsonLdSrc = readFileSync(join(root, "lib/jsonLd.ts"), "utf8");
const guidePageSrc = readFileSync(
  join(root, "app/guides/[slug]/page.tsx"),
  "utf8"
);
const guidesSrc = readFileSync(join(root, "lib/guides.ts"), "utf8");
const trustSrc = readFileSync(
  join(root, "components/HomeTrustFooter.tsx"),
  "utf8"
);
const languageProviderSrc = readFileSync(
  join(root, "components/LanguageProvider.tsx"),
  "utf8"
);
const privacySrc = readFileSync(join(root, "app/privacy/page.tsx"), "utf8");
const termsSrc = readFileSync(join(root, "app/terms/page.tsx"), "utf8");
const robotsSrc = readFileSync(join(root, "app/robots.ts"), "utf8");
const pricingHeroSrc = readFileSync(
  join(root, "components/PricingHeroCopy.tsx"),
  "utf8"
);
const llmsTxt = readFileSync(join(root, "public/llms.txt"), "utf8");

assert.match(seoIndex, /COLD_START_MARKETING_INDEX_PATHS/);
assert.match(seoIndex, /COLD_START_LEGAL_INDEX_PATHS/);
assert.match(seoIndex, /COLD_START_INDEX_PATHS/);
assert.match(sitemap, /COLD_START_INDEX_PATHS/);
assert.match(releaseDoc, /five indexable URLs|Five-page release/i);

const marketingBlock = seoIndex.match(
  /COLD_START_MARKETING_INDEX_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/
);
assert.ok(marketingBlock, "marketing allowlist present");
const marketingPaths = [...marketingBlock[1].matchAll(/"([^"]+)"/g)].map(
  (m) => m[1]
);
assert.equal(
  marketingPaths.length,
  5,
  `marketing budget must be exactly 5, got ${marketingPaths.length}`
);
assert.deepEqual(marketingPaths, [
  "/",
  "/tools/ai-toy-video-generator",
  "/effects/360-spin-showcase",
  "/tools/blind-box-reveal-video-maker",
  "/pricing",
]);

const legalBlock = seoIndex.match(
  /COLD_START_LEGAL_INDEX_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/
);
assert.ok(legalBlock, "legal allowlist present");
const legalPaths = [...legalBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(legalPaths, ["/privacy", "/terms"]);

const fullBlock = seoIndex.match(
  /export const COLD_START_INDEX_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/
);
assert.ok(fullBlock, "full COLD_START_INDEX_PATHS present");
// Spread composition — count by resolving marketing + legal lengths
assert.equal(
  marketingPaths.length + legalPaths.length,
  7,
  "sitemap allowlist = 5 marketing + 2 legal"
);

// Long-tail dump must leave the index allowlist (stay reachable + noindex)
for (const thin of [
  "/tools/figure-360-product-video",
  "/tools/one-photo-product-video",
  "/tools/ai-product-video-generator-for-toys",
  "/for/etsy-listing-videos",
  "/for/photo-to-video-for-toys",
  "/for/action-figure-product-videos",
  "/explore",
  "/community",
  "/modules",
  "/cinema",
]) {
  assert.ok(
    !marketingPaths.includes(thin) && !legalPaths.includes(thin),
    `${thin} must not be cold-start indexable`
  );
}

const toolSlugs = seoIndex.match(
  /COLD_START_INDEXABLE_TOOL_SLUGS\s*=\s*\[([\s\S]*?)\]\s*as const/
);
assert.ok(toolSlugs);
const tools = [...toolSlugs[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(tools, [
  "ai-toy-video-generator",
  "blind-box-reveal-video-maker",
]);

// Private / preview still noindex helpers
assert.match(seoIndex, /PRIVATE_ROBOTS/);
assert.match(seoIndex, /PREVIEW_ROBOTS/);
assert.match(seoIndex, /CONCEPT_ROBOTS/);

// Social cards: centralized, resolvable static metadata routes (no extensionless 404).
assert.match(siteSrc, /pikbo-launch-pack-og-v2\.png/);
assert.match(siteSrc, /officialProfiles/);
assert.doesNotMatch(siteSrc, /twitter:\s*["']@pikbo_ai/);
assert.match(layoutSrc, /site\.socialImages\.openGraph/);
assert.match(layoutSrc, /site\.socialImages\.twitter/);
assert.doesNotMatch(layoutSrc, /url:\s*["']\/opengraph-image["']/);

// Google-first metadata: do not emit the unsupported meta-keywords tag.
for (const [name, src] of [
  ["root layout", layoutSrc],
  ["home", homeSrc],
  ["tool pages", toolPageSrc],
  [
    "effect pages",
    readFileSync(join(root, "app/effects/[slug]/page.tsx"), "utf8"),
  ],
  ["use-case pages", readFileSync(join(root, "app/for/[slug]/page.tsx"), "utf8")],
]) {
  assert.doesNotMatch(src, /\bkeywords\s*:/, `${name} must not emit meta keywords`);
}

// Retired sitelinks SearchAction and dead social entities must stay absent.
assert.doesNotMatch(jsonLdSrc, /SearchAction|potentialAction/);
assert.doesNotMatch(jsonLdSrc, /sameAs:\s*\[\s*\]/);

// Video indexing: one prominent primary-tool prototype, not six homepage decorations.
assert.doesNotMatch(homeSrc, /videoObjectJsonLd/);
assert.match(toolPageSrc, /videoObjectJsonLd\(primaryDemo/);
assert.match(toolPageSrc, /Watch a cached AI toy video prototype/);
assert.match(toolPageSrc, /data-tools-friction="cached-preview"/);
assert.doesNotMatch(
  toolPageSrc,
  /No sign-up\. No card\. One photo → one video\. Free\./
);
assert.match(sitemap, /videos:/);
assert.match(sitemap, /content_loc:/);
assert.match(sitemap, /scout-spin/);

// Homepage language and trust surface.
assert.doesNotMatch(homeSrc, /轮到你|上传自有/);
assert.doesNotMatch(
  languageProviderSrc,
  /detectLocaleFromNavigator/,
  "first visits should keep the global English default"
);
for (const path of [
  "/about",
  "/privacy",
  "/terms",
  "/guides/how-to-photograph-toys-for-ai-video",
]) {
  assert.ok(trustSrc.includes(path), `home trust footer links ${path}`);
}
assert.match(trustSrc, /mailto:/);
assert.match(homeSrc, /HomeTrustFooter/);

// Indexed guide: real authorship/dates, a visible checklist, and primary sources.
assert.match(guidesSrc, /datePublished:\s*"2026-/);
assert.match(guidesSrc, /dateModified:\s*"2026-/);
assert.match(guidesSrc, /Google Merchant Center image guidelines/);
assert.match(guidesSrc, /Etsy listing image requirements/);
assert.match(guidesSrc, /Apple: lock camera focus and exposure/);
assert.match(guidePageSrc, /Toy-photo preflight checklist/);
assert.match(guidePageSrc, /Sources and review method/);
assert.match(guidePageSrc, /datePublished/);
assert.match(guidePageSrc, /dateModified/);
assert.match(guidePageSrc, /href="\/tools\/ai-toy-video-generator"/);
assert.match(guidePageSrc, /href="\/tools\/blind-box-reveal-video-maker"/);
assert.match(pricingHeroSrc, /Pricing built around finished toy videos/);

// Trust/legal copy must distinguish 0-credit cached previews from gated Live jobs.
assert.match(
  privacySrc,
  /Cached\s+prototype previews do not process your upload/i
);
assert.match(privacySrc, /eligible Live submission/);
assert.match(termsSrc, /Cached prototype previews do not process your upload/);
assert.match(termsSrc, /eligible signed-in\s+account/);
assert.doesNotMatch(robotsSrc, /9-URL/);

// llms.txt is a supplemental, truthful mirror of the seven canonical URLs.
const llmsUrls = [...llmsTxt.matchAll(/https:\/\/pikbo\.ai(?:\/[^\s)]+|\/)/g)].map(
  (match) => match[0]
);
assert.deepEqual(llmsUrls, [
  "https://pikbo.ai/",
  "https://pikbo.ai/tools/ai-toy-video-generator",
  "https://pikbo.ai/effects/360-spin-showcase",
  "https://pikbo.ai/tools/blind-box-reveal-video-maker",
  "https://pikbo.ai/pricing",
  "https://pikbo.ai/privacy",
  "https://pikbo.ai/terms",
]);
assert.match(llmsTxt, /does not guarantee sales, reach, rankings/i);

console.log(
  "seo-cold-start-smoke: PASS (7 canonical URLs; Google-first metadata, trust, guide evidence and one primary-tool video)"
);
