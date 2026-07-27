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
  "/tools/blind-box-reveal-video-maker",
  "/guides/how-to-photograph-toys-for-ai-video",
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

console.log(
  "seo-cold-start-smoke: PASS (5 marketing + 2 legal; long-tail tools/for noindex)"
);
