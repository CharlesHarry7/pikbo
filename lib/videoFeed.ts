import { DEMO_VIDEOS, type DemoVideo } from "@/lib/demoVideos";
import { PRESETS, CATEGORIES, type CategoryId } from "@/lib/presets";
import { APPS } from "@/lib/catalog";
import { MODELS } from "@/lib/catalog";
import { viralName } from "@/lib/viralNames";
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
  /** Project inspect page (cached Lab prototype) */
  projectHref?: string;
  badge?: string;
  ratio: "9:16" | "1:1" | "16:9" | "video";
  /** Present only when this exact recipe has its own registered media proof. */
  demo?: DemoVideo;
  /** Static-only art for an unverified concept recipe. Never a borrowed clip. */
  conceptArt?: {
    gradient: string;
    emoji: string;
  };
  kind: "demo" | "preset" | "app" | "model";
  category?: CategoryId;
  recipeSlug?: string;
};

export type FeedVideoItem = FeedItem & { demo: DemoVideo };

export function hasFeedVideo(item: FeedItem): item is FeedVideoItem {
  return Boolean(item.demo?.mp4 && item.demo.poster);
}

export type CommunityProject = {
  id: string;
  title: string;
  look: string;
  remakeHref: string;
  detailHref: string;
  visibility: "Concept" | "Cached prototype";
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
 * HF Viral Presets–density wall for home: every unique cached Lab preview.
 * Media rights/provider evidence is still pending; no shared-loop fakes.
 */
export function buildViralPresetsWallFeed(): FeedVideoItem[] {
  return buildHomeShowcaseFeed();
}

/**
 * Homepage main proof wall — only the product-whitelisted 8 slugs, each with a
 * unique Lab demo asset. No shared-loop density fills.
 */
export function buildHomeShowcaseFeed(
  limit = HOME_SHOWCASE_LIMIT
): FeedVideoItem[] {
  return listHomeShowcaseProjects()
    .slice(0, limit)
    .map((project) => {
      const preset = PRESETS.find((p) => p.slug === project.recipeSlug);
      return {
        id: `home-${project.slug}`,
        title: viralName(project.recipeSlug, project.title),
        subtitle: project.character,
        // AIT-55: wall CTAs use stable analytics/intent source (guest-safe).
        href: createRemixHref(project.recipeSlug, "home-proof-wall"),
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
      } satisfies FeedVideoItem;
    });
}

/**
 * Lab / Feed catalog — **unique cached prototypes only**.
 * Concept recipes without their own footage live on `/effects`, not a
 * shared-loop density wall that looks like a full product catalog.
 */
export function buildVideoFeed(): FeedVideoItem[] {
  return listShowcaseProjects().map((project) => {
    const preset = PRESETS.find((p) => p.slug === project.recipeSlug);
    return {
      id: `demo-${project.slug}`,
      title: viralName(project.recipeSlug, project.title),
      subtitle: project.character,
      href: showcaseRecipeHref(project),
      detailHref: `/effects/${project.recipeSlug}`,
      projectHref: showcaseProjectHref(project),
      badge: "PIKBO Lab · cached prototype",
      ratio:
        project.aspectRatio === "1:1" || project.aspectRatio === "16:9"
          ? project.aspectRatio
          : "9:16",
      demo: showcaseProjectAsDemo(project),
      kind: "demo",
      category: preset?.category,
      recipeSlug: project.recipeSlug,
    } satisfies FeedVideoItem;
  });
}

/** Count of recipes without unique Lab footage (for honest empty/CTA copy). */
export function conceptRecipeCount(): number {
  const withFootage = new Set(DEMO_VIDEOS.map((d) => d.preset));
  return PRESETS.filter((p) => !withFootage.has(p.slug)).length;
}

export function featuredStrip(): FeedVideoItem[] {
  return listShowcaseProjects().map((project) => ({
    id: `feat-${project.slug}`,
    title: viralName(project.recipeSlug, project.title),
    subtitle: project.result,
    href: showcaseRecipeHref(project),
    detailHref: `/effects/${project.recipeSlug}`,
    projectHref: showcaseProjectHref(project),
    badge: "PIKBO Lab · cached prototype",
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
  // Cached Lab prototypes only — no remixed concept filler that reuses loops.
  return listShowcaseProjects().map((project) => ({
    id: `proj-${project.slug}`,
    title: project.title,
    look: project.eyebrow,
    remakeHref: showcaseRecipeHref(project),
    detailHref: showcaseProjectHref(project),
    visibility: "Cached prototype" as const,
    author: {
      name: "Pikbo Lab",
      initials: "P",
      badge: "Pikbo Lab",
    },
    demo: showcaseProjectAsDemo(project),
  }));
}

/** Resolve cached Lab prototype by demo id (for /projects/[slug]). */
export function getCachedLabProject(slug: string) {
  const project = getShowcaseProject(slug);
  if (!project) return null;
  return {
    ...project,
    demo: showcaseProjectAsDemo(project),
    remakeHref: showcaseRecipeHref(project),
    effectsHref: `/effects/${project.recipeSlug}`,
  };
}

/** All cached Lab prototype slugs — SSG + sitemap. */
export function listCachedLabProjectSlugs(): string[] {
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

export function feedByCategory(cat: CategoryId): FeedItem[] {
  return PRESETS.filter((p) => p.category === cat).map((p) => {
    const mapped = DEMO_VIDEOS.find((d) => d.preset === p.slug);
    return {
      id: `cat-${cat}-${p.slug}`,
      title: viralName(p.slug, p.name),
      subtitle: mapped ? p.tagline : `Concept recipe · ${p.tagline}`,
      // Concepts open their recipe notes. They do not imply that borrowed
      // footage can be remixed into the advertised result.
      href: mapped ? createHref(p.slug, mapped.id) : `/effects/${p.slug}`,
      detailHref: `/effects/${p.slug}`,
      badge: mapped ? "PIKBO Lab · cached prototype" : "Concept",
      ratio:
        p.aspectRatio === "1:1"
          ? "1:1"
          : p.aspectRatio === "16:9"
            ? "16:9"
            : "9:16",
      demo: mapped,
      conceptArt: mapped
        ? undefined
        : {
            gradient: p.gradient,
            emoji: p.emoji,
          },
      kind: "preset" as const,
      category: p.category,
      recipeSlug: p.slug,
    };
  });
}

export function allCategoryFeeds() {
  return CATEGORIES.map((c) => ({
    category: c,
    items: feedByCategory(c.id),
  }));
}
