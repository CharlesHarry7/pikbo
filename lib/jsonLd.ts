/**
 * Shared Schema.org JSON-LD builders (哥飞 SEO — structured data for tool sites).
 * Keep ItemList.numberOfItems === itemListElement.length always.
 *
 * VideoObject dates must be ISO 8601 DateTime (GSC rejects date-only uploadDate).
 */

import { site } from "@/lib/site";
import type { DemoVideo } from "@/lib/demoVideos";
import { getPreset } from "@/lib/presets";

/** ISO 8601 DateTime with timezone (GSC VideoObject.uploadDate). */
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;

export function isIso8601DateTime(value: string): boolean {
  return ISO_DATETIME_RE.test(value);
}

/** ISO 8601 duration from whole seconds (e.g. 5 → PT5S). */
export function iso8601DurationFromSeconds(sec: number): string | null {
  if (!Number.isFinite(sec) || sec <= 0 || !Number.isInteger(sec)) return null;
  if (sec < 60) return `PT${sec}S`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `PT${m}M${s}S` : `PT${m}M`;
}

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
  // Duration only from registered recipe metadata — never invent play counts / ratings.
  const presetDuration = getPreset(demo.preset)?.duration;
  const duration =
    typeof presetDuration === "number"
      ? iso8601DurationFromSeconds(presetDuration)
      : null;

  // Per-demo first publish time — never a single forged global date.
  if (!isIso8601DateTime(demo.publishedAt)) {
    throw new Error(
      `DemoVideo ${demo.id}: publishedAt must be ISO 8601 DateTime with timezone`
    );
  }

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: demo.title,
    description: `${demo.result} PIKBO Lab cached prototype (not a visitor upload; provider task evidence pending).`,
    thumbnailUrl: `${site.url}${demo.poster}`,
    contentUrl: `${site.url}${demo.mp4}`,
    uploadDate: demo.publishedAt,
    ...(duration ? { duration } : {}),
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
