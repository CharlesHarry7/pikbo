/**
 * PIKBO Lab cached prototype projects.
 *
 * Home, Explore, Community, the sitemap, and /projects/[slug] all read this
 * registry. The current repository does not contain the provider task IDs,
 * rights records, distinct input assets, or signed QA needed for a verified
 * case study. The poster is therefore a reference poster, never claimed as the
 * provider input that produced the cached clip.
 */

import { DEMO_VIDEOS, type DemoVideo } from "@/lib/demoVideos";
import { getPreset } from "@/lib/presets";
import {
  HOME_PROOF_LIMIT,
  HOME_PROOF_SLUGS,
} from "@/lib/softLaunch";
import { createRemixHref } from "@/lib/remixIntent";
import { viralName } from "@/lib/viralNames";

export type ShowcaseProvenance =
  | "cached_prototype"
  | "live_generated"
  | "concept";

export type ShowcaseCategory =
  | "listing"
  | "unboxing"
  | "come-alive"
  | "social-hooks"
  | "story";

export type ShowcaseProject = {
  slug: string;
  title: string;
  character: string;
  /** Reference poster only; not proven to be the provider input frame. */
  referencePoster: string;
  outputVideo: string;
  outputWebm?: string;
  poster: string;
  recipeSlug: string;
  provenance: ShowcaseProvenance;
  model: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  promptSummary: string;
  negativeConstraints: string[];
  category: ShowcaseCategory;
  result: string;
  eyebrow: string;
  accent: string;
  sourceRecord: string;
};

export const SHOWCASE_CATEGORIES: ReadonlyArray<{
  id: "all" | ShowcaseCategory;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "listing", label: "Listing" },
  { id: "unboxing", label: "Unboxing" },
  { id: "come-alive", label: "Come alive" },
  { id: "social-hooks", label: "Social hooks" },
  { id: "story", label: "Story" },
];

const PROJECT_META: Record<
  string,
  Pick<
    ShowcaseProject,
    | "category"
    | "model"
    | "resolution"
    | "promptSummary"
    | "negativeConstraints"
    | "sourceRecord"
  >
> = {
  "orbit-cgi": {
    category: "listing",
    model: "Provider unverified · cached prototype",
    resolution: "Web preview",
    promptSummary:
      "Lift the figure into a clean product-hero frame with a restrained orbit and stable studio light.",
    negativeConstraints: [
      "Keep silhouette and paint colors stable",
      "Do not invent packaging text",
      "No duplicate figure or extra limbs",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "moon-reveal": {
    category: "unboxing",
    model: "Provider unverified · cached prototype",
    resolution: "Web preview",
    promptSummary:
      "Reveal the figure from a blind-box style setup with a quick opening beat and a clean final hold.",
    negativeConstraints: [
      "Do not claim unseen box artwork is exact",
      "Keep the face and colorway stable",
      "No human hands fused with the toy",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "scout-story": {
    category: "story",
    model: "Provider unverified · cached prototype",
    resolution: "Web preview",
    promptSummary:
      "Place the figure inside a miniature cinematic environment with gentle camera travel and readable scale.",
    negativeConstraints: [
      "Keep proportions and material stable",
      "No duplicate character",
      "Avoid illegible signs and logos",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "beatbot-hook": {
    category: "social-hooks",
    model: "Provider unverified · cached prototype",
    resolution: "Web preview",
    promptSummary:
      "Open with a fast flash-and-motion hook, preserve the figure, then hold a clean drop-day product frame.",
    negativeConstraints: [
      "No face morphing",
      "Keep paint and accessories stable",
      "No fake brand or price text",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "scout-spin": {
    category: "listing",
    model: "Provider unverified · cached prototype",
    resolution: "Web preview",
    promptSummary:
      "Create a controlled product spin that keeps the silhouette centered and suitable for a marketplace listing.",
    negativeConstraints: [
      "Do not invent unseen product details",
      "No warped base or accessories",
      "Keep background uncluttered",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "beatbot-unboxed": {
    category: "unboxing",
    model: "Provider unverified · cached prototype",
    resolution: "Web preview",
    promptSummary:
      "Stage an energetic collector reveal around the figure, finishing on a clear product shot.",
    negativeConstraints: [
      "No invented readable packaging copy",
      "No duplicate figure",
      "Keep character identity stable",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "orbit-dance": {
    category: "come-alive",
    model: "Provider unverified · cached prototype",
    resolution: "480p cached source",
    promptSummary:
      "Give the figure a short rhythmic dance while keeping its toy proportions and painted expression.",
    negativeConstraints: [
      "No humanized face",
      "No extra limbs",
      "Keep feet and base geometry stable",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "moon-glow": {
    category: "listing",
    model: "Provider unverified · cached prototype",
    resolution: "480p cached source",
    promptSummary:
      "Add boutique display-case lighting and a slow premium camera move around the figure.",
    negativeConstraints: [
      "No colorway drift",
      "No added logos or readable text",
      "Keep material finish stable",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "scout-walk": {
    category: "come-alive",
    model: "Provider unverified · cached prototype",
    resolution: "480p cached source",
    promptSummary:
      "Animate a short toy-scale walk cycle with stable proportions and a simple camera follow.",
    negativeConstraints: [
      "No leg duplication",
      "No rubbery body deformation",
      "Keep the painted face unchanged",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "beatbot-neon": {
    category: "story",
    model: "Provider unverified · cached prototype",
    resolution: "480p cached source",
    promptSummary:
      "Move the figure through a neon miniature scene with controlled parallax and a clear final hero frame.",
    negativeConstraints: [
      "No fake readable city signage",
      "No character duplication",
      "Keep accessories attached",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "orbit-aura": {
    category: "social-hooks",
    model: "Provider unverified · cached prototype",
    resolution: "480p cached source",
    promptSummary:
      "Build an energy-aura reveal around the figure while preserving its silhouette and paint treatment.",
    negativeConstraints: [
      "Effects must not cover the product",
      "No anatomy changes",
      "No added trademarks",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
  "moon-smoke": {
    category: "social-hooks",
    model: "Provider unverified · cached prototype",
    resolution: "480p cached source",
    promptSummary:
      "Use a brief smoke-burst entrance as the hook, then reveal the figure in a readable product frame.",
    negativeConstraints: [
      "Smoke must not hide the final product",
      "No identity or color drift",
      "No duplicate figure",
    ],
    sourceRecord: "Cached prototype media · no provider task ID or rights record",
  },
};

function projectFromDemo(demo: DemoVideo): ShowcaseProject | null {
  const meta = PROJECT_META[demo.id];
  const preset = getPreset(demo.preset);
  if (!meta || !preset || !demo.poster || !demo.mp4) return null;

  return {
    slug: demo.id,
    title: `${demo.character} · ${viralName(demo.preset, demo.title)}`,
    character: demo.character,
    referencePoster: demo.poster,
    outputVideo: demo.mp4,
    outputWebm:
      demo.webm && demo.webm.endsWith(".webm") ? demo.webm : undefined,
    poster: demo.poster,
    recipeSlug: demo.preset,
    provenance: "cached_prototype",
    model: meta.model,
    aspectRatio: demo.ratio,
    durationSeconds: preset.duration,
    resolution: meta.resolution,
    promptSummary: meta.promptSummary,
    negativeConstraints: meta.negativeConstraints,
    category: meta.category,
    result: demo.result,
    eyebrow: demo.eyebrow,
    accent: demo.accent,
    sourceRecord: meta.sourceRecord,
  };
}

const projects = DEMO_VIDEOS.map(projectFromDemo).filter(
  (project): project is ShowcaseProject => Boolean(project)
);

function assertRegistryIntegrity(list: ShowcaseProject[]) {
  const slugs = new Set<string>();
  const outputs = new Set<string>();
  for (const project of list) {
    if (slugs.has(project.slug)) {
      throw new Error(`Duplicate ShowcaseProject slug: ${project.slug}`);
    }
    if (outputs.has(project.outputVideo)) {
      throw new Error(
        `ShowcaseProject output reused under another title: ${project.outputVideo}`
      );
    }
    slugs.add(project.slug);
    outputs.add(project.outputVideo);
  }
  // Retention wall: every whitelisted recipe needs its own distinct cached clip.
  // This is not a verified or quality-scored proof gate.
  const byRecipe = new Map(list.map((p) => [p.recipeSlug, p]));
  for (const recipe of HOME_PROOF_SLUGS) {
    const p = byRecipe.get(recipe);
    if (!p) {
      throw new Error(`HOME_PROOF recipe missing ShowcaseProject: ${recipe}`);
    }
  }
}

assertRegistryIntegrity(projects);

export function listShowcaseProjects(): ShowcaseProject[] {
  return [...projects];
}

export function listHomeShowcaseProjects(): ShowcaseProject[] {
  const byRecipe = new Map(projects.map((project) => [project.recipeSlug, project]));
  return HOME_PROOF_SLUGS.map((slug) => byRecipe.get(slug))
    .filter((project): project is ShowcaseProject => Boolean(project))
    .slice(0, HOME_PROOF_LIMIT);
}

export function getShowcaseProject(slug: string): ShowcaseProject | null {
  return projects.find((project) => project.slug === slug) ?? null;
}

/** Resolve Lab project by recipe slug (home wall / explore proof chips). */
export function getShowcaseProjectByRecipe(
  recipeSlug: string
): ShowcaseProject | null {
  return projects.find((project) => project.recipeSlug === recipeSlug) ?? null;
}

export function listShowcaseProjectSlugs(): string[] {
  return projects.map((project) => project.slug);
}

export function listShowcaseProjectsByCategory(
  category: "all" | ShowcaseCategory
): ShowcaseProject[] {
  return category === "all"
    ? listShowcaseProjects()
    : projects.filter((project) => project.category === category);
}

export function showcaseProjectHref(project: ShowcaseProject): string {
  return `/projects/${project.slug}`;
}

export function showcaseRecipeHref(project: ShowcaseProject): string {
  return createRemixHref(project.recipeSlug, project.slug);
}

/** Compatibility adapter for video components while the registry stays canonical. */
export function showcaseProjectAsDemo(
  project: ShowcaseProject
): DemoVideo {
  // Prefer registry publishedAt when this project maps to a Lab demo id
  const fromRegistry = DEMO_VIDEOS.find((d) => d.id === project.slug);
  return {
    id: project.slug,
    title: project.title,
    character: project.character,
    eyebrow: project.eyebrow,
    result: project.result,
    preset: project.recipeSlug,
    ratio:
      project.aspectRatio === "1:1" || project.aspectRatio === "16:9"
        ? project.aspectRatio
        : "9:16",
    poster: project.poster,
    mp4: project.outputVideo,
    webm: project.outputWebm ?? project.outputVideo,
    accent: project.accent,
    publishedAt:
      fromRegistry?.publishedAt ??
      DEMO_VIDEOS.find((d) => d.preset === project.recipeSlug)?.publishedAt ??
      "2026-07-22T11:57:06Z",
  };
}

export function showcaseProvenanceLabel(
  provenance: ShowcaseProvenance
): string {
  if (provenance === "live_generated") return "Live generation";
  if (provenance === "concept") return "Concept recipe";
  return "PIKBO Lab · cached prototype";
}

/** Recipe still registered? Used by static smoke checks and project integrity. */
export function showcaseRecipeExists(recipeSlug: string): boolean {
  return Boolean(getPreset(recipeSlug));
}
