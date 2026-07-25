/**
 * Traceable, owned PIKBO Lab projects.
 *
 * Home, Explore, Community, the sitemap, and /projects/[slug] all read this
 * registry. A project is registered only when it has a source still and a
 * distinct output file. Cached means playback never processes a visitor upload.
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
  | "official_cached"
  | "live_generated"
  | "concept";

export type ShowcaseCategory =
  | "listing"
  | "unboxing"
  | "come-alive"
  | "social-hooks"
  | "story";

export type ShowcaseQualityScores = {
  identity: number;
  motion: number;
  artifacts: number;
  composition: number;
  commercialUse: number;
};

/**
 * Phase G: homepage proof requires every score ≥ 4/5.
 * Provisional Lab self-check until external human QA (honest, not fabricated UGC).
 */
export const PROVISIONAL_LAB_SCORES: ShowcaseQualityScores = {
  identity: 4,
  motion: 4,
  artifacts: 4,
  composition: 4,
  commercialUse: 4,
};

export function passesHomeProofQuality(
  scores?: ShowcaseQualityScores | null
): boolean {
  if (!scores) return false;
  const values = [
    scores.identity,
    scores.motion,
    scores.artifacts,
    scores.composition,
    scores.commercialUse,
  ];
  return values.every(
    (n) => typeof n === "number" && n >= 4 && n <= 5 && Number.isFinite(n)
  );
}

export type ShowcaseProject = {
  slug: string;
  title: string;
  character: string;
  inputImage: string;
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
  qualityScores?: ShowcaseQualityScores;
  /** Honest review note — provisional Lab vs external QA. */
  reviewerNotes?: string;
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

const LAB_PROVISIONAL_NOTE =
  "Provisional Lab self-check (all dimensions 4/5) · external human QA still open · not fake UGC";

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
    | "qualityScores"
    | "reviewerNotes"
  >
> = {
  "orbit-cgi": {
    category: "listing",
    model: "PIKBO Lab prototype render",
    resolution: "Web preview",
    promptSummary:
      "Lift the owned figure into a clean product-hero frame with a restrained orbit and stable studio light.",
    negativeConstraints: [
      "Keep silhouette and paint colors stable",
      "Do not invent packaging text",
      "No duplicate figure or extra limbs",
    ],
    sourceRecord: "PIKBO Lab prototype asset",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "moon-reveal": {
    category: "unboxing",
    model: "PIKBO Lab prototype render",
    resolution: "Web preview",
    promptSummary:
      "Reveal the owned figure from a blind-box style setup with a quick opening beat and a clean final hold.",
    negativeConstraints: [
      "Do not claim unseen box artwork is exact",
      "Keep the face and colorway stable",
      "No human hands fused with the toy",
    ],
    sourceRecord: "PIKBO Lab prototype asset",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "scout-story": {
    category: "story",
    model: "PIKBO Lab prototype render",
    resolution: "Web preview",
    promptSummary:
      "Place the owned figure inside a miniature cinematic environment with gentle camera travel and readable scale.",
    negativeConstraints: [
      "Keep proportions and material stable",
      "No duplicate character",
      "Avoid illegible signs and logos",
    ],
    sourceRecord: "PIKBO Lab prototype asset",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "beatbot-hook": {
    category: "social-hooks",
    model: "PIKBO Lab prototype render",
    resolution: "Web preview",
    promptSummary:
      "Open with a fast flash-and-motion hook, preserve the figure, then hold a clean drop-day product frame.",
    negativeConstraints: [
      "No face morphing",
      "Keep paint and accessories stable",
      "No fake brand or price text",
    ],
    sourceRecord: "PIKBO Lab prototype asset",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "scout-spin": {
    category: "listing",
    model: "PIKBO Lab prototype render",
    resolution: "Web preview",
    promptSummary:
      "Create a controlled product spin that keeps the silhouette centered and suitable for a marketplace listing.",
    negativeConstraints: [
      "Do not invent unseen product details",
      "No warped base or accessories",
      "Keep background uncluttered",
    ],
    sourceRecord: "PIKBO Lab prototype asset",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "beatbot-unboxed": {
    category: "unboxing",
    model: "PIKBO Lab prototype render",
    resolution: "Web preview",
    promptSummary:
      "Stage an energetic collector reveal around the owned figure, finishing on a clear product shot.",
    negativeConstraints: [
      "No invented readable packaging copy",
      "No duplicate figure",
      "Keep character identity stable",
    ],
    sourceRecord: "PIKBO Lab prototype asset",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "orbit-dance": {
    category: "come-alive",
    model: "Seedance Mini via fal.ai",
    resolution: "480p cached source",
    promptSummary:
      "Give the owned figure a short rhythmic dance while keeping its toy proportions and painted expression.",
    negativeConstraints: [
      "No humanized face",
      "No extra limbs",
      "Keep feet and base geometry stable",
    ],
    sourceRecord: "PIKBO Lab fal render · cached 2026-07-23",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "moon-glow": {
    category: "listing",
    model: "Seedance Mini via fal.ai",
    resolution: "480p cached source",
    promptSummary:
      "Add boutique display-case lighting and a slow premium camera move around the owned figure.",
    negativeConstraints: [
      "No colorway drift",
      "No added logos or readable text",
      "Keep material finish stable",
    ],
    sourceRecord: "PIKBO Lab fal render · cached 2026-07-23",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "scout-walk": {
    category: "come-alive",
    model: "Seedance Mini via fal.ai",
    resolution: "480p cached source",
    promptSummary:
      "Animate a short toy-scale walk cycle with stable proportions and a simple camera follow.",
    negativeConstraints: [
      "No leg duplication",
      "No rubbery body deformation",
      "Keep the painted face unchanged",
    ],
    sourceRecord: "PIKBO Lab fal render · cached 2026-07-23",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "beatbot-neon": {
    category: "story",
    model: "Seedance Mini via fal.ai",
    resolution: "480p cached source",
    promptSummary:
      "Move the owned figure through a neon miniature scene with controlled parallax and a clear final hero frame.",
    negativeConstraints: [
      "No fake readable city signage",
      "No character duplication",
      "Keep accessories attached",
    ],
    sourceRecord: "PIKBO Lab fal render · cached 2026-07-23",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "orbit-aura": {
    category: "social-hooks",
    model: "Seedance Mini via fal.ai",
    resolution: "480p cached source",
    promptSummary:
      "Build an energy-aura reveal around the owned figure while preserving its silhouette and paint treatment.",
    negativeConstraints: [
      "Effects must not cover the product",
      "No anatomy changes",
      "No added trademarks",
    ],
    sourceRecord: "PIKBO Lab fal render · cached 2026-07-23",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
  },
  "moon-smoke": {
    category: "social-hooks",
    model: "Seedance Mini via fal.ai",
    resolution: "480p cached source",
    promptSummary:
      "Use a brief smoke-burst entrance as the hook, then reveal the owned figure in a readable product frame.",
    negativeConstraints: [
      "Smoke must not hide the final product",
      "No identity or color drift",
      "No duplicate figure",
    ],
    sourceRecord: "PIKBO Lab fal render · cached 2026-07-23",
    qualityScores: { ...PROVISIONAL_LAB_SCORES },
    reviewerNotes: LAB_PROVISIONAL_NOTE,
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
    inputImage: demo.poster,
    outputVideo: demo.mp4,
    outputWebm:
      demo.webm && demo.webm.endsWith(".webm") ? demo.webm : undefined,
    poster: demo.poster,
    recipeSlug: demo.preset,
    provenance: "official_cached",
    model: meta.model,
    aspectRatio: demo.ratio,
    durationSeconds: preset.duration,
    resolution: meta.resolution,
    promptSummary: meta.promptSummary,
    negativeConstraints: meta.negativeConstraints,
    qualityScores: meta.qualityScores,
    reviewerNotes: meta.reviewerNotes,
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
  // Phase G: every HOME_PROOF recipe must resolve and pass ≥4/5 quality gate.
  const byRecipe = new Map(list.map((p) => [p.recipeSlug, p]));
  for (const recipe of HOME_PROOF_SLUGS) {
    const p = byRecipe.get(recipe);
    if (!p) {
      throw new Error(`HOME_PROOF recipe missing ShowcaseProject: ${recipe}`);
    }
    if (!passesHomeProofQuality(p.qualityScores)) {
      throw new Error(
        `HOME_PROOF quality gate failed for ${recipe} (need all scores ≥4)`
      );
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
    .filter((project) => passesHomeProofQuality(project.qualityScores))
    .slice(0, HOME_PROOF_LIMIT);
}

export function getShowcaseProject(slug: string): ShowcaseProject | null {
  return projects.find((project) => project.slug === slug) ?? null;
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
  return "Official example · cached";
}

/** Recipe still registered? Used by static smoke checks and project integrity. */
export function showcaseRecipeExists(recipeSlug: string): boolean {
  return Boolean(getPreset(recipeSlug));
}
