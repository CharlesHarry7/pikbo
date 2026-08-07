/**
 * Curated homepage wall — fewer, stronger cards (not a landfill).
 * Lab motion (proof 8) + best JP/US IP stills only.
 * Video-ready: add id to VIDEO_LOOP_IDS + drop public/demos/loops/{id}.mp4
 */

import { DEMO_VIDEOS, type DemoVideo } from "@/lib/demoVideos";
import {
  buildHomeShowcaseFeed,
  hasFeedVideo,
  type FeedVideoItem,
} from "@/lib/videoFeed";
import { createRemixHref } from "@/lib/remixIntent";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { viralName } from "@/lib/viralNames";
import { createGenerate360Href } from "@/lib/jobIntents";

export type AttractionCard = {
  id: string;
  title: string;
  subtitle?: string;
  badge: string;
  href: string;
  demo?: DemoVideo;
  poster: string;
  region?: "JP" | "US" | "JP/US" | "Lab";
  recipeSlug?: string;
  projectHref?: string;
  isProof?: boolean;
  is360?: boolean;
};

/** Register loop ids when videos land under /demos/loops/{id}.mp4 */
export const VIDEO_LOOP_IDS = new Set<string>([]);

/** Best-of IP stills only — max 8, no duplicates of lab demos */
export const FLASHY_IP_STILLS: {
  id: string;
  title: string;
  region: AttractionCard["region"];
  poster: string;
  badge: string;
  href: string;
  videoMp4?: string;
  videoWebm?: string;
}[] = [
  {
    id: "jp-anime-scale",
    title: "ANIME SCALE",
    region: "JP",
    poster: "/collectibles/jp-anime-scale.webp",
    badge: "JP",
    href: "/toys/anime-figures",
  },
  {
    id: "fx-mecha-neon",
    title: "NEON MECHA",
    region: "JP",
    poster: "/collectibles/fx-mecha-neon.webp",
    badge: "JP",
    href: createGenerate360Href("attraction-fx-mecha"),
  },
  {
    id: "jp-blindbox",
    title: "BLIND BOX",
    region: "JP",
    poster: "/collectibles/jp-blindbox.webp",
    badge: "JP",
    href: createRemixHref("blind-box-unboxing", "jp-blind"),
  },
  {
    id: "us-urban-vinyl",
    title: "STREET VINYL",
    region: "US",
    poster: "/collectibles/us-urban-vinyl.webp",
    badge: "US",
    href: `${MOMENT_CREATE_HREF}&source=attraction-us-vinyl`,
  },
  {
    id: "us-action-figure",
    title: "ACTION HERO",
    region: "US",
    poster: "/collectibles/us-action-figure.webp",
    badge: "US",
    href: "/toys/action-figures",
  },
  {
    id: "jp-sofubi",
    title: "SOFUBI",
    region: "JP",
    poster: "/collectibles/jp-sofubi.webp",
    badge: "JP",
    href: "/toys/resin-sofubi",
  },
  {
    id: "us-pop-vinyl",
    title: "POP VINYL",
    region: "US",
    poster: "/collectibles/us-pop-vinyl.webp",
    badge: "US",
    href: "/toys/art-toys",
  },
  {
    id: "jp-us-shelf",
    title: "IP SHELF",
    region: "JP/US",
    poster: "/collectibles/jp-us-shelf.webp",
    badge: "JP/US",
    href: "/toys/art-toys",
  },
];

function proofToCard(item: FeedVideoItem): AttractionCard {
  const slug = item.recipeSlug ?? item.demo.preset;
  return {
    id: item.id,
    title: viralName(slug, item.title).toUpperCase(),
    subtitle: item.subtitle,
    badge: "Lab",
    href: item.href,
    demo: item.demo,
    poster: item.demo.poster,
    region: "Lab",
    recipeSlug: slug,
    projectHref: item.projectHref,
    isProof: true,
    is360: slug === "360-spin-showcase",
  };
}

function attachLoopIfPresent(
  card: AttractionCard,
  still?: (typeof FLASHY_IP_STILLS)[number]
): AttractionCard {
  const mp4 =
    still?.videoMp4 ||
    (VIDEO_LOOP_IDS.has(card.id) ? `/demos/loops/${card.id}.mp4` : null);
  if (!mp4) return card;
  const webm =
    still?.videoWebm ||
    (VIDEO_LOOP_IDS.has(card.id) ? `/demos/loops/${card.id}.webm` : mp4);
  const demo: DemoVideo = {
    id: card.id,
    title: card.title,
    character: card.region || "IP",
    eyebrow: "IP motion",
    result: "Generated 潮玩 motion loop",
    preset: card.recipeSlug || "street-power-up",
    ratio: "9:16",
    poster: card.poster,
    mp4,
    webm,
    accent: "#e0b35c",
    publishedAt: "2026-08-06T00:00:00Z",
  };
  return { ...card, demo, badge: `${card.badge} · live` };
}

/**
 * Clean wall: 8 Lab motion proofs + 8 best IP stills = 16 cards.
 * No extra demo flood, no duplicate flash set.
 */
export function buildHomeAttractionFeed(): AttractionCard[] {
  const proofCards = buildHomeShowcaseFeed()
    .filter(hasFeedVideo)
    .map(proofToCard);

  const stillCards = FLASHY_IP_STILLS.map((s) =>
    attachLoopIfPresent(
      {
        id: s.id,
        title: s.title,
        badge: s.badge,
        href: s.href,
        poster: s.poster,
        region: s.region,
      },
      s
    )
  );

  return [...proofCards, ...stillCards];
}
