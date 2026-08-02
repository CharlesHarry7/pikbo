import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { COLD_START_INDEX_PATHS } from "@/lib/seoIndex";

/**
 * Cold-start crawl budget: home + primary product job + pricing + legal/support.
 * Thin hubs, Lab walls, extra tools/for/guides stay reachable + noindex.
 * See docs/growth/SEO_INDEXABLE_10_RELEASE.md.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const reviewedAt = "2026-08-01";

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
          : path.startsWith("/tools/")
            ? 0.85
            : path === "/pricing"
              ? 0.8
              : 0.5,
  }));
}
