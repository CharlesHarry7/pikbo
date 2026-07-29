import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { COLD_START_INDEX_PATHS } from "@/lib/seoIndex";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { getPreset } from "@/lib/presets";

/**
 * Cold-start crawl budget: home + pricing + three high-intent product jobs
 * plus legal.
 * Thin hubs, Lab walls, extra tools/for/guides stay reachable + noindex.
 * See docs/growth/SEO_INDEXABLE_10_RELEASE.md.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const reviewedAt = "2026-07-29";
  const primaryVideo = DEMO_VIDEOS.find((demo) => demo.id === "scout-spin");
  const primaryVideoDuration = primaryVideo
    ? getPreset(primaryVideo.preset)?.duration
    : undefined;

  return COLD_START_INDEX_PATHS.map((path) => ({
    url: path === "/" ? site.url : `${site.url}${path}`,
    lastModified: reviewedAt,
    changeFrequency: path === "/" || path.includes("ai-toy-video")
      ? ("daily" as const)
      : ("weekly" as const),
    priority:
      path === "/"
        ? 1
        : path.includes("ai-toy-video-generator")
          ? 0.95
          : path.startsWith("/tools/") || path.startsWith("/effects/")
            ? 0.85
            : path === "/pricing"
              ? 0.8
              : 0.5,
    ...(path === "/tools/ai-toy-video-generator" && primaryVideo
      ? {
          videos: [
            {
              title: primaryVideo.title,
              thumbnail_loc: `${site.url}${primaryVideo.poster}`,
              description:
                "A cached Pikbo Lab prototype showing a listing-ready toy spin from one product photo.",
              content_loc: `${site.url}${primaryVideo.mp4}`,
              ...(primaryVideoDuration
                ? { duration: primaryVideoDuration }
                : {}),
              publication_date: primaryVideo.publishedAt,
              family_friendly: "yes" as const,
              tag: "AI toy video generator",
            },
          ],
        }
      : {}),
  }));
}
