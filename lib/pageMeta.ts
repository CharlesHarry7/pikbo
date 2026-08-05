/**
 * Shared Open Graph / Twitter card builders so public routes do not ship
 * incomplete social metadata (missing og:image or twitter:card).
 */
import type { Metadata } from "next";
import { site } from "@/lib/site";

export type PageSocialInput = {
  title: string;
  description: string;
  /** Site path with leading slash, or "/" for home. */
  path: string;
  imageAlt?: string;
};

function absoluteUrl(path: string): string {
  if (!path || path === "/") return site.url;
  return path.startsWith("http")
    ? path
    : `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Full openGraph + twitter:summary_large_image block with the shared OG asset. */
export function pageSocialMeta(input: PageSocialInput): Pick<
  Metadata,
  "openGraph" | "twitter"
> {
  const url = absoluteUrl(input.path);
  const alt = input.imageAlt ?? site.socialImages.alt;
  return {
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: site.name,
      type: "website",
      images: [
        {
          url: site.socialImages.openGraph,
          width: site.socialImages.width,
          height: site.socialImages.height,
          alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [site.socialImages.twitter],
    },
  };
}
