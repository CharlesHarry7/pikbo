import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * GSC P0 crawl contract:
 * - Private / auth / device surfaces: disallow
 * - Preview/Lab pages (image, cinema, community, models, flow, batch):
 *   ALLOW crawl so noindex meta can be read — never dual-block with robots.txt
 * - Sitemap remains the seven-URL cold-start allowlist
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/profile",
        "/settings",
        "/library",
        "/login",
        "/auth/",
        "/checkout",
        "/status",
        // Legacy alias only — soft-launch path is /create
        "/generate",
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
