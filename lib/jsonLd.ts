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
    logo: site.socialImages.openGraph,
    image: site.socialImages.openGraph,
    email: site.contact.supportEmail,
    ...(site.officialProfiles.length > 0
      ? { sameAs: [...site.officialProfiles] }
      : {}),
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
      logo: site.socialImages.openGraph,
    },
  };
}

/** Soft-launch product schema for Create / tool surfaces. */
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
    image: site.socialImages.openGraph,
    featureList: [
      "Owned toy photo to short product video",
      "Cached Street Power-Up preview and invited private beta",
      "Fixed 9:16 · 5s · Fast 720p Moment contract",
      "Owner-only Library delivery and download",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description:
        "Public cached previews cost 0 credits. Founding Studio paid Moments remain private-beta gated.",
      availability: "https://schema.org/OnlineOnly",
      url: `${site.url}/pricing`,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.url,
    },
  };
}

export function videoObjectJsonLd(
  demo: DemoVideo,
  watchPagePath?: string
) {
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
    ...(watchPagePath
      ? {
          url: `${site.url}${watchPagePath}`,
          mainEntityOfPage: `${site.url}${watchPagePath}`,
        }
      : {}),
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
