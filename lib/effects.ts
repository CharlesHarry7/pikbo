/**
 * Toy Effect Studio catalog — Higgsfield-style preset wall for designer toys.
 *
 * Product truth (CURRENT_LAUNCH_CONTRACT / AGENTS.md):
 * - Only Street Power-Up is a live Moment contract (private beta).
 * - All other studio effects are honest "Coming Soon" concepts.
 * - Previews use cached Lab / style-study stills — not live generation proof.
 */

export type EffectStatus = "live" | "coming_soon";

export type EffectCategory =
  | "launch"
  | "showcase"
  | "story"
  | "play"
  | "packaging";

export type ToyEffect = {
  slug: string;
  name: string;
  /** Optional Chinese label for bilingual studio chrome */
  nameZh?: string;
  emoji: string;
  /** Short card blurb */
  description: string;
  /** Longer detail-page copy */
  longDescription: string;
  gradient: string;
  /** Static preview under /public — placeholder/mock allowed */
  previewImage: string;
  /** Optional cached Lab clip for live/preview surfaces */
  previewVideo?: {
    poster: string;
    mp4: string;
    webm?: string;
  };
  status: EffectStatus;
  /** Create path for live effects only */
  tryHref?: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSec: 5 | 10;
  category: EffectCategory;
  tagline: string;
};

export const EFFECT_CATEGORIES: {
  id: EffectCategory;
  label: string;
  blurb: string;
}[] = [
  {
    id: "launch",
    label: "Drop & Launch",
    blurb: "Scroll-stopping energy for drop day and restocks.",
  },
  {
    id: "showcase",
    label: "Product Showcase",
    blurb: "Listing-ready motion that keeps the sculpt readable.",
  },
  {
    id: "packaging",
    label: "Box & Unboxing",
    blurb: "Package theater for blind boxes and sealed drops.",
  },
  {
    id: "story",
    label: "Scenes & Worlds",
    blurb: "Tiny dioramas and story beats around your figure.",
  },
  {
    id: "play",
    label: "Play & Battle",
    blurb: "Stop-motion play and toy-vs-toy drama.",
  },
];

/**
 * Featured Toy Effect Studio set (10+).
 * Street Power-Up is the only live Moment; everything else is Coming Soon.
 */
export const TOY_EFFECTS: ToyEffect[] = [
  {
    slug: "street-power-up",
    name: "Street Power-Up",
    nameZh: "街头觉醒",
    emoji: "⚡",
    description:
      "One owned toy photo → a private 9:16, 5s launch moment with city light and restrained energy.",
    longDescription:
      "Street Power-Up is Pikbo's first real Moment contract. Upload a clear photo of a toy you own; private beta renders one continuous 9:16, 5-second, 720p launch clip. The toy's design, colors, and proportions are preserved as the camera pushes in through rain-slick city light and a restrained energy reveal. Review face, paint, logos, and accessories before you post.",
    gradient: "linear-gradient(145deg,#0f172a 0%,#164e63 45%,#22d3ee 100%)",
    previewImage: "/demos/beatbot-still.webp",
    previewVideo: {
      poster: "/demos/beatbot-still.webp",
      mp4: "/demos/beatbot-viral-hook.mp4",
      webm: "/demos/beatbot-viral-hook.webm",
    },
    status: "live",
    tryHref: "/create?effect=street-power-up",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "launch",
    tagline: "The first live Moment · drop-day energy",
  },
  {
    slug: "action-figure-battle",
    name: "Action Figure Battle",
    nameZh: "手办对战",
    emoji: "🥊",
    description:
      "Pose your figure into a cinematic clash beat — dynamic framing, impact dust, hero freeze.",
    longDescription:
      "Action Figure Battle stages a short fight-scene beat around your sculpt: impact framing, dust and light, and a confident hero freeze. Coming soon after Street Power-Up proves the single-Moment loop for sellers.",
    gradient: "linear-gradient(145deg,#1a0a0a 0%,#7f1d1d 50%,#f97316 100%)",
    previewImage: "/moments/hangar-ignition.jpg",
    status: "coming_soon",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "play",
    tagline: "Clash beat · impact freeze",
  },
  {
    slug: "360-unboxing-spin",
    name: "360 Unboxing Spin",
    nameZh: "360拆盒旋转",
    emoji: "🌀",
    description:
      "Combine unbox energy with a smooth product spin so buyers see the figure from every angle.",
    longDescription:
      "360 Unboxing Spin pairs package-open energy with a clean product orbit — ideal for marketplace galleries and restock posts. Concept only until a dedicated Moment contract ships; Street Power-Up remains the live path today.",
    gradient: "linear-gradient(145deg,#1e1b4b 0%,#6d28d9 50%,#f472b6 100%)",
    previewImage: "/demos/scout-still.webp",
    previewVideo: {
      poster: "/demos/scout-still.webp",
      mp4: "/demos/scout-packshot-spin.mp4",
      webm: "/demos/scout-packshot-spin.webm",
    },
    status: "coming_soon",
    aspectRatio: "1:1",
    durationSec: 5,
    category: "showcase",
    tagline: "Unbox + orbit · listing spin",
  },
  {
    slug: "diorama-scene",
    name: "Diorama Scene",
    nameZh: "微缩场景",
    emoji: "🏙️",
    description:
      "Place your figure in a tiny cinematic world — shelf-scale story without a full photo set.",
    longDescription:
      "Diorama Scene turns one figure photo into a miniature story world: soft practical lights, shallow depth of field, and a slow camera drift that keeps the sculpt readable. Planned as a story Moment after the launch contract is solid.",
    gradient: "linear-gradient(145deg,#0c1222 0%,#1e3a5f 50%,#fbbf24 100%)",
    previewImage: "/moments/softroom-morning.jpg",
    previewVideo: {
      poster: "/demos/scout-still.webp",
      mp4: "/demos/scout-story-mode.mp4",
      webm: "/demos/scout-story-mode.webm",
    },
    status: "coming_soon",
    aspectRatio: "16:9",
    durationSec: 5,
    category: "story",
    tagline: "Tiny world · shelf cinema",
  },
  {
    slug: "stop-motion-play",
    name: "Stop Motion Play",
    nameZh: "定格玩耍",
    emoji: "🎬",
    description:
      "Classic stop-motion play energy — playful ticks of motion that feel handmade, not CGI-slick.",
    longDescription:
      "Stop Motion Play aims for the handmade tick of frame-by-frame toy photography: short pose steps, tactile lighting, and a collector-friendly loop. Coming soon — not available as a live Moment yet.",
    gradient: "linear-gradient(145deg,#1a1025 0%,#5b21b6 45%,#c8ff3d 100%)",
    previewImage: "/style-studies/plush-hybrid-v1.jpg",
    status: "coming_soon",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "play",
    tagline: "Handmade ticks · collector loop",
  },
  {
    slug: "glow-up-reveal",
    name: "Glow Up Reveal",
    nameZh: "高光揭示",
    emoji: "✨",
    description:
      "Boutique light sweep and reveal beat that makes a shelf piece read as a grail.",
    longDescription:
      "Glow Up Reveal is a display-case glam Moment: rim light, glossy reflections, and a controlled reveal that flatters paint apps without inventing a new sculpt. Concept preview only until scheduled as a live Moment.",
    gradient: "linear-gradient(145deg,#0a0a12 0%,#4c1d95 50%,#e9d5ff 100%)",
    previewImage: "/moments/gallery-spotlight.jpg",
    previewVideo: {
      poster: "/demos/moon-float.webp",
      mp4: "/demos/moon-glow.mp4",
      webm: "/demos/moon-glow.mp4",
    },
    status: "coming_soon",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "showcase",
    tagline: "Boutique light · grail reveal",
  },
  {
    slug: "factory-assembly",
    name: "Factory Assembly",
    nameZh: "工厂组装",
    emoji: "🏭",
    description:
      "Industrial assembly-line theater — parts converge into the finished figure under hard practicals.",
    longDescription:
      "Factory Assembly stages a short industrial build: silhouettes on a line, hard practical lights, and a final assembled hero. Stylized concept for launch storytelling — not a live Moment contract yet.",
    gradient: "linear-gradient(145deg,#111827 0%,#374151 45%,#94a3b8 100%)",
    previewImage: "/moments/colorblock-pedestal.jpg",
    status: "coming_soon",
    aspectRatio: "16:9",
    durationSec: 5,
    category: "story",
    tagline: "Assembly line · finished hero",
  },
  {
    slug: "package-opening",
    name: "Package Opening",
    nameZh: "开箱时刻",
    emoji: "📦",
    description:
      "Sealed-box tension into the first clear look at the figure — restock and drop posts.",
    longDescription:
      "Package Opening captures the sealed-box beat sellers already film by hand: tension, tear, and the first clear read of the figure. Concept surface with cached style reference; live Moment path remains Street Power-Up.",
    gradient: "linear-gradient(145deg,#1c1917 0%,#9a3412 50%,#fbbf24 100%)",
    previewImage: "/moments/capsule-reveal.jpg",
    previewVideo: {
      poster: "/demos/moon-float.webp",
      mp4: "/demos/moon-box-reveal.mp4",
      webm: "/demos/moon-box-reveal.webm",
    },
    status: "coming_soon",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "packaging",
    tagline: "Sealed tension · first look",
  },
  {
    slug: "collection-showcase",
    name: "Collection Showcase",
    nameZh: "收藏陈列",
    emoji: "🗄️",
    description:
      "Slow shelf pan energy for a full display — flex the collection without a handheld tour.",
    longDescription:
      "Collection Showcase is aimed at collectors who want a cinematic shelf flex from a single display photo. Concept only; no live multi-figure Moment in private beta.",
    gradient: "linear-gradient(145deg,#042f2e 0%,#0f766e 50%,#99f6e4 100%)",
    previewImage: "/moments/gallery-spotlight.jpg",
    status: "coming_soon",
    aspectRatio: "16:9",
    durationSec: 5,
    category: "showcase",
    tagline: "Shelf flex · slow pan",
  },
  {
    slug: "toy-vs-toy",
    name: "Toy vs Toy",
    nameZh: "玩具对决",
    emoji: "⚔️",
    description:
      "Two-figure showdown framing — face-off energy for series drops and rival SKUs.",
    longDescription:
      "Toy vs Toy stages a dual-character face-off for series marketing and rival SKUs. Requires multi-input support that is not part of the current single-photo Street Power-Up contract — marked Coming Soon.",
    gradient: "linear-gradient(145deg,#1a0a14 0%,#9f1239 50%,#fb7185 100%)",
    previewImage: "/moments/alley-drop-flash.jpg",
    status: "coming_soon",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "play",
    tagline: "Face-off · rival SKUs",
  },
  {
    slug: "blind-box-mystery",
    name: "Blind Box Mystery",
    nameZh: "盲盒悬念",
    emoji: "🎁",
    description:
      "Mystery-box tease with silhouette and color hints — restock hooks without spoiling the pull.",
    longDescription:
      "Blind Box Mystery keeps the figure half-hidden for a tease: silhouette, accent color, and package cues. Concept catalog entry for the unboxing lane; not a live Moment yet.",
    gradient: "linear-gradient(145deg,#0f172a 0%,#312e81 50%,#a5b4fc 100%)",
    previewImage: "/style-studies/art-vinyl-blind-box-direction-v1.jpg",
    status: "coming_soon",
    aspectRatio: "9:16",
    durationSec: 5,
    category: "packaging",
    tagline: "Silhouette tease · restock hook",
  },
  {
    slug: "pedestal-hero",
    name: "Pedestal Hero",
    nameZh: "基座英雄",
    emoji: "🗿",
    description:
      "Clean pedestal hero shot with soft orbit — premium product still energy in motion.",
    longDescription:
      "Pedestal Hero is a clean commercial orbit on a color-block base — the classic product-hero look for storefronts. Planned showcase Moment; live generation today is Street Power-Up only.",
    gradient: "linear-gradient(145deg,#18181b 0%,#3f3f46 40%,#c8ff3d 100%)",
    previewImage: "/moments/colorblock-pedestal.jpg",
    status: "coming_soon",
    aspectRatio: "1:1",
    durationSec: 5,
    category: "showcase",
    tagline: "Product hero · soft orbit",
  },
];

export function getToyEffect(slug: string): ToyEffect | undefined {
  return TOY_EFFECTS.find((e) => e.slug === slug);
}

export function listToyEffects(): ToyEffect[] {
  return TOY_EFFECTS;
}

export function liveToyEffects(): ToyEffect[] {
  return TOY_EFFECTS.filter((e) => e.status === "live");
}

export function isLiveEffect(slug: string): boolean {
  return getToyEffect(slug)?.status === "live";
}

export function effectsByCategory(category: EffectCategory): ToyEffect[] {
  return TOY_EFFECTS.filter((e) => e.category === category);
}

/** Badge label for studio cards and detail chrome. */
export function effectStatusLabel(status: EffectStatus): string {
  return status === "live" ? "Try Now" : "Coming Soon";
}
