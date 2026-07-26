import { DEMO_VIDEOS, type DemoVideo } from "@/lib/demoVideos";
import { PRESETS, CATEGORIES, type CategoryId } from "@/lib/presets";
import { APPS } from "@/lib/catalog";
import { MODELS } from "@/lib/catalog";
import { viralName } from "@/lib/viralNames";
import {
  getEffectProof,
  listProvenEffectDemos,
} from "@/lib/effectProof";
import {
  HOME_PROOF_BADGE,
  HOME_PROOF_LIMIT,
} from "@/lib/softLaunch";
import { createRemixHref } from "@/lib/remixIntent";
import {
  getShowcaseProject,
  listHomeShowcaseProjects,
  listShowcaseProjects,
  listShowcaseProjectSlugs,
  showcaseProjectAsDemo,
  showcaseProjectHref,
  showcaseRecipeHref,
} from "@/lib/showcaseProjects";

export type FeedItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** SEO / detail page when href is generate */
  detailHref?: string;
  /** Project inspect page (official Lab) */
  projectHref?: string;
  badge?: string;
  ratio: "9:16" | "1:1" | "16:9" | "video";
  demo: DemoVideo;
  kind: "demo" | "preset" | "app" | "model";
  category?: CategoryId;
  recipeSlug?: string;
};

export type ProvenEffectFeedItem = FeedItem & {
  proofStatus: "proven";
};

export type ConceptEffectFeedItem = Omit<FeedItem, "demo"> & {
  proofStatus: "concept";
  conceptEmoji: string;
  conceptGradient: string;
};

export type EffectFeedItem =
  | ProvenEffectFeedItem
  | ConceptEffectFeedItem;

export type CommunityProject = {
  id: string;
  title: string;
  look: string;
  remakeHref: string;
  detailHref: string;
  visibility: "Concept" | "Official example";
  author: { name: string; initials: string; badge?: string };
  demo: DemoVideo;
};

function demoForIndex(i: number): DemoVideo {
  return DEMO_VIDEOS[i % DEMO_VIDEOS.length];
}

function createHref(presetSlug: string, sourceId?: string) {
  return createRemixHref(presetSlug, sourceId);
}

/** Soft-launch homepage showcase cap (G2) — frozen by SOFT_NAV_AND_PRESETS. */
export const HOME_SHOWCASE_LIMIT = HOME_PROOF_LIMIT;

/**
 * HF Viral Presets–density wall for home: every unique Lab demo + every
 * showcase project card. Uses only owned footage (no shared-loop fakes).
 */
export function buildViralPresetsWallFeed(): FeedItem[] {
  const fromDemos: FeedItem[] = listProvenEffectDemos().map((demo) => {
    const preset = PRESETS.find((p) => p.slug === demo.preset);
    return {
      id: `viral-demo-${demo.id}`,
      title: viralName(demo.preset, demo.title),
      subtitle: demo.eyebrow,
      href: createHref(demo.preset, demo.id),
      detailHref: `/effects/${demo.preset}`,
      badge: HOME_PROOF_BADGE,
      ratio: demo.ratio,
      demo,
      kind: "demo" as const,
      category: preset?.category,
      recipeSlug: demo.preset,
    };
  });
  const seenPresets = new Set(fromDemos.map((f) => f.recipeSlug));
  const fromProjects: FeedItem[] = listShowcaseProjects()
    .filter((p) => !seenPresets.has(p.recipeSlug))
    .map((project) => {
      const preset = PRESETS.find((p) => p.slug === project.recipeSlug);
      return {
        id: `viral-proj-${project.slug}`,
        title: viralName(project.recipeSlug, project.title),
        subtitle: project.character,
        href: showcaseRecipeHref(project),
        detailHref: `/effects/${project.recipeSlug}`,
        projectHref: showcaseProjectHref(project),
        badge: HOME_PROOF_BADGE,
        ratio:
          project.aspectRatio === "1:1" || project.aspectRatio === "16:9"
            ? project.aspectRatio
            : "9:16",
        demo: showcaseProjectAsDemo(project),
        kind: "demo" as const,
        category: preset?.category,
        recipeSlug: project.recipeSlug,
      } satisfies FeedItem;
    });
  return [...fromDemos, ...fromProjects];
}

/**
 * Homepage main proof wall — only the product-whitelisted 8 slugs, each with a
 * unique Lab demo asset. No shared-loop density fills.
 */
export function buildHomeShowcaseFeed(
  limit = HOME_SHOWCASE_LIMIT
): FeedItem[] {
  return listHomeShowcaseProjects()
    .slice(0, limit)
    .map((project) => {
      const preset = PRESETS.find((p) => p.slug === project.recipeSlug);
      return {
        id: `home-${project.slug}`,
        title: viralName(project.recipeSlug, project.title),
        subtitle: project.character,
        href: showcaseRecipeHref(project),
        detailHref: `/effects/${project.recipeSlug}`,
        projectHref: showcaseProjectHref(project),
        badge: HOME_PROOF_BADGE,
        ratio:
          project.aspectRatio === "1:1" || project.aspectRatio === "16:9"
            ? project.aspectRatio
            : "9:16",
        demo: showcaseProjectAsDemo(project),
        kind: "demo",
        category: preset?.category,
        recipeSlug: project.recipeSlug,
      } satisfies FeedItem;
    });
}

/**
 * Lab / Feed catalog — **official unique demos only** (G2/G3).
 * Concept recipes without their own footage live on `/effects`, not a
 * shared-loop density wall that looks like a full product catalog.
 */
export function buildVideoFeed(): FeedItem[] {
  return listShowcaseProjects().map((project) => {
    const preset = PRESETS.find((p) => p.slug === project.recipeSlug);
    return {
      id: `demo-${project.slug}`,
      title: viralName(project.recipeSlug, project.title),
      subtitle: project.character,
      href: showcaseRecipeHref(project),
      detailHref: `/effects/${project.recipeSlug}`,
      projectHref: showcaseProjectHref(project),
      badge: "Official example · cached",
      ratio:
        project.aspectRatio === "1:1" || project.aspectRatio === "16:9"
          ? project.aspectRatio
          : "9:16",
      demo: showcaseProjectAsDemo(project),
      kind: "demo",
      category: preset?.category,
      recipeSlug: project.recipeSlug,
    } satisfies FeedItem;
  });
}

/** Count of recipes without unique Lab footage (for honest empty/CTA copy). */
export function conceptRecipeCount(): number {
  return PRESETS.filter((preset) => !getEffectProof(preset.slug)).length;
}

export function featuredStrip(): FeedItem[] {
  return listShowcaseProjects().map((project) => ({
    id: `feat-${project.slug}`,
    title: viralName(project.recipeSlug, project.title),
    subtitle: project.result,
    href: showcaseRecipeHref(project),
    detailHref: `/effects/${project.recipeSlug}`,
    projectHref: showcaseProjectHref(project),
    badge: "Official example · cached",
    ratio:
      project.aspectRatio === "1:1" || project.aspectRatio === "16:9"
        ? project.aspectRatio
        : "9:16",
    demo: showcaseProjectAsDemo(project),
    kind: "demo" as const,
    recipeSlug: project.recipeSlug,
  }));
}

/** PIKBO Lab projects only; no user identity or engagement is fabricated. */
export function communityProjects(): CommunityProject[] {
  // Official Lab demos only — no remixed concept filler that reuses loops.
  return listShowcaseProjects().map((project) => ({
    id: `proj-${project.slug}`,
    title: project.title,
    look: project.eyebrow,
    remakeHref: showcaseRecipeHref(project),
    detailHref: showcaseProjectHref(project),
    visibility: "Official example" as const,
    author: {
      name: "Pikbo Lab",
      initials: "P",
      badge: "Pikbo Lab",
    },
    demo: showcaseProjectAsDemo(project),
  }));
}

/** Resolve official Lab project by demo id (for /projects/[slug]). */
export function getOfficialProject(slug: string) {
  const project = getShowcaseProject(slug);
  if (!project) return null;
  return {
    ...project,
    demo: showcaseProjectAsDemo(project),
    remakeHref: showcaseRecipeHref(project),
    effectsHref: `/effects/${project.recipeSlug}`,
  };
}

/** All official Lab project slugs — SSG + sitemap. */
export function listOfficialProjectSlugs(): string[] {
  return listShowcaseProjectSlugs();
}

/** @deprecated import registry helpers from lib/showcaseProjects directly. */
export {
  getShowcaseProject as getRegisteredShowcaseProject,
  listShowcaseProjects,
} from "@/lib/showcaseProjects";

/** Wide HF-style app / model promo rail */
export function suiteRail(): FeedItem[] {
  const apps = APPS.filter((a) => a.live).map((a, i) => ({
    id: `suite-app-${a.id}`,
    title: a.name,
    subtitle: a.blurb,
    href: a.href,
    badge: "Configured · cached preview",
    ratio: "16:9" as const,
    demo: demoForIndex(i),
    kind: "app" as const,
  }));

  const models = MODELS.filter((m) => m.live)
    .slice(0, 4)
    .map((m, i) => ({
      id: `suite-model-${m.id}`,
      title: m.name,
      subtitle: m.blurb,
      href: m.href,
      badge: "Configured · cached preview",
      ratio: "16:9" as const,
      demo: demoForIndex(i + 1),
      kind: "model" as const,
    }));

  return [...models, ...apps];
}

export function feedByCategory(cat: CategoryId): EffectFeedItem[] {
  return PRESETS.filter((p) => p.category === cat).map((p) => {
    const proof = getEffectProof(p.slug);
    const ratio =
      p.aspectRatio === "1:1"
        ? "1:1"
        : p.aspectRatio === "16:9"
          ? "16:9"
          : "9:16";

    if (!proof) {
      return {
        id: `cat-${cat}-${p.slug}`,
        title: viralName(p.slug, p.name),
        subtitle: `Concept recipe · No demo yet · ${p.tagline}`,
        href: `/effects/${p.slug}`,
        detailHref: `/effects/${p.slug}`,
        badge: "Concept recipe · No demo yet",
        ratio,
        kind: "preset" as const,
        category: p.category,
        recipeSlug: p.slug,
        proofStatus: "concept" as const,
        conceptEmoji: p.emoji,
        conceptGradient: p.gradient,
      } satisfies ConceptEffectFeedItem;
    }

    return {
      id: `cat-${cat}-${p.slug}`,
      title: viralName(p.slug, p.name),
      subtitle: p.tagline,
      href: createHref(p.slug),
      detailHref: `/effects/${p.slug}`,
      badge: "Official example · cached",
      ratio,
      demo: proof.demo,
      kind: "preset" as const,
      category: p.category,
      recipeSlug: p.slug,
      proofStatus: "proven" as const,
    } satisfies ProvenEffectFeedItem;
  });
}

export function allCategoryFeeds() {
  return CATEGORIES.map((c) => ({
    category: c,
    items: feedByCategory(c.id),
  }));
}
