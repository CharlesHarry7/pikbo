/**
 * Shared Schema.org JSON-LD builders (哥飞 SEO — structured data for tool sites).
 * Keep ItemList.numberOfItems === itemListElement.length always.
 */

import { site } from "@/lib/site";
import type { DemoVideo } from "@/lib/demoVideos";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    description: site.description,
    slogan: site.tagline,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${site.url}/tools?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Soft-launch product schema for Generate / tool surfaces. */
export function softwareApplicationJsonLd(opts?: {
  name?: string;
  description?: string;
  url?: string;
  applicationCategory?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts?.name ?? `${site.name} — AI Toy Video Generator`,
    applicationCategory: opts?.applicationCategory ?? "MultimediaApplication",
    operatingSystem: "Web",
    url: opts?.url ?? `${site.url}/create`,
    description: opts?.description ?? site.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description:
        "Free Mini trial: one live Seedance Mini clip (5s · 480p · on-player mark). Paid plans coming soon.",
    },
    featureList: [
      "Photo to short toy video",
      "Seedance Mini live generate",
      "Listing and social aspect ratios",
      "Honest free trial limits",
    ],
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
  };
}

export function videoObjectJsonLd(demo: DemoVideo) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: demo.title,
    description: `${demo.result} Official Pikbo Lab sample (cached demo — not a visitor upload).`,
    thumbnailUrl: `${site.url}${demo.poster}`,
    contentUrl: `${site.url}${demo.mp4}`,
    uploadDate: "2026-07-20",
    isFamilyFriendly: true,
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
  };
}

export function itemListJsonLd(input: {
  name: string;
  description: string;
  items: { name: string; url: string; description?: string }[];
}) {
  const items = input.items;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    description: input.description,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
      ...(it.description ? { description: it.description } : {}),
    })),
  };
}
