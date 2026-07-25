import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { COLD_START_INDEX_PATHS } from "@/lib/seoIndex";

/**
 * 哥飞冷启动爬取预算：sitemap 只列可索引白名单。
 * 薄页 / Community Lab / Preview suite / 多余意图页可达但 noindex，不进 sitemap。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const reviewedAt = "2026-07-25";

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
          : path === "/explore"
            ? 0.7
            : 0.65,
  }));
}
