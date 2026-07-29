/**
 * Public recipe-media provenance. This is separate from provider evidence and
 * from the broader ShowcaseProject provenance contract.
 */
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import type { ShowcaseProvenance } from "@/lib/showcaseProjects";

export type MediaProvenance =
  | "official_cached"
  | "live_generated"
  | "concept";

export const MEDIA_PROVENANCE_LABELS: Record<MediaProvenance, string> = {
  official_cached: "Official cached sample",
  live_generated: "Live generated",
  concept: "Concept · static treatment",
};

export function mediaProvenanceForRecipe(recipeSlug: string): MediaProvenance {
  return DEMO_VIDEOS.some((demo) => demo.preset === recipeSlug)
    ? "official_cached"
    : "concept";
}

export function mediaProvenanceFromShowcase(
  provenance: ShowcaseProvenance
): MediaProvenance {
  if (provenance === "live_generated") return "live_generated";
  if (provenance === "concept") return "concept";
  return "official_cached";
}
