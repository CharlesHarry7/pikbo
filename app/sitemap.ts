import type { MetadataRoute } from "next";
import { PRESETS } from "@/lib/presets";
import { USE_CASES } from "@/lib/usecases";
import { TOY_TYPES } from "@/lib/toytypes";
import { GUIDES } from "@/lib/guides";
import { TOOLS } from "@/lib/tools";
import { listOfficialProjectSlugs } from "@/lib/videoFeed";
import { site } from "@/lib/site";
import {
  proofBackedRecipeSlugs,
  recipeHasUniqueProof,
} from "@/lib/seoIndex";

/**
 * Phase H: sitemap lists only index-worthy surfaces.
 * Concept recipes without unique Lab proof stay reachable but noindex —
 * they are omitted here so search does not treat them as thin pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const reviewedAt = "2026-07-24";
  const proofRecipes = new Set(proofBackedRecipeSlugs());

  const staticPages = [
    "",
    "/effects",
    "/tools",
    "/for",
    "/toys",
    "/guides",
    "/create",
    "/modules",
    "/apps",
    "/pricing",
    "/privacy",
    "/terms",
    "/community",
    "/explore",
  ].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: reviewedAt,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  // Only proof-backed effect landings (unique DEMO_VIDEOS match).
  const effectPages = PRESETS.filter((p) => proofRecipes.has(p.slug)).map(
    (p) => ({
      url: `${site.url}/effects/${p.slug}`,
      lastModified: reviewedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  // Tools whose primary recipe has unique proof.
  const toolPages = TOOLS.filter((t) =>
    recipeHasUniqueProof(t.primaryEffect)
  ).map((t) => ({
    url: `${site.url}/tools/${t.slug}`,
    lastModified: reviewedAt,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const projectPages = listOfficialProjectSlugs().map((slug) => ({
    url: `${site.url}/projects/${slug}`,
    lastModified: reviewedAt,
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  const useCasePages = USE_CASES.filter((u) =>
    recipeHasUniqueProof(u.recommendedEffects[0] ?? "")
  ).map((u) => ({
    url: `${site.url}/for/${u.slug}`,
    lastModified: reviewedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const toyTypePages = TOY_TYPES.filter((t) =>
    recipeHasUniqueProof(t.recommendedEffects[0] ?? "")
  ).map((t) => ({
    url: `${site.url}/toys/${t.slug}`,
    lastModified: reviewedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const guidePages = GUIDES.map((g) => ({
    url: `${site.url}/guides/${g.slug}`,
    lastModified: reviewedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...effectPages,
    ...toolPages,
    ...projectPages,
    ...useCasePages,
    ...toyTypePages,
    ...guidePages,
  ];
}
