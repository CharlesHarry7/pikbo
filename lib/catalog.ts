/**
 * Suite catalog (big-app structure) with Pikbo toy-native copy (own style).
 */

import {
  createJobRemixHref,
  createWorkbenchHref,
} from "@/lib/jobIntents";

export type CatalogModel = {
  id: string;
  name: string;
  vendor: string;
  kind: "video" | "image" | "audio" | "agent";
  tag?: string;
  blurb: string;
  href: string;
  gradient: string;
  live?: boolean;
  falId?: string;
};

export type CatalogApp = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  href: string;
  category: "video" | "image" | "edit" | "studio";
  live?: boolean;
};

export const MODELS: CatalogModel[] = [
  {
    id: "seedance-2",
    name: "Seedance 2.0",
    vendor: "ByteDance",
    kind: "video",
    tag: "Best for toys",
    blurb: "Keeps paint lines & sculpt readable while the figure moves.",
    href: "/create?model=seedance-2",
    gradient: "linear-gradient(135deg,#ff4d8d,#a855f7)",
    live: true,
    falId: "bytedance/seedance-2.0/image-to-video",
  },
  {
    id: "seedance-mini",
    name: "Seedance Mini",
    vendor: "ByteDance",
    kind: "video",
    tag: "Wool / free path",
    blurb: "Cheapest live path (~$0.07/s @480p). Free trial + fal signup credits.",
    href: "/create?model=seedance-mini",
    gradient: "linear-gradient(135deg,#86efac,#0d9488)",
    live: true,
    falId: "bytedance/seedance-2.0/mini/image-to-video",
  },
  {
    id: "seedance-fast",
    name: "Seedance Fast",
    vendor: "ByteDance",
    kind: "video",
    tag: "Balanced",
    blurb: "Quick shelf clips when you're batching listings.",
    href: "/create?model=seedance-fast",
    gradient: "linear-gradient(135deg,#6ee7c7,#a855f7)",
    live: true,
    falId: "bytedance/seedance-2.0/fast/image-to-video",
  },
  {
    id: "kling",
    name: "Kling",
    vendor: "Kuaishou",
    kind: "video",
    tag: "Soon",
    blurb: "Extra physics for action poses — slot reserved.",
    href: "/models",
    gradient: "linear-gradient(135deg,#3b82f6,#1e1b4b)",
  },
  {
    id: "veo",
    name: "Veo",
    vendor: "Google",
    kind: "video",
    tag: "Soon",
    blurb: "Longer cinematic shelves — coming later.",
    href: "/models",
    gradient: "linear-gradient(135deg,#60a5fa,#312e81)",
  },
  {
    id: "sora",
    name: "Sora",
    vendor: "OpenAI",
    kind: "video",
    tag: "Soon",
    blurb: "Narrative world shots for dioramas — catalog only.",
    href: "/models",
    gradient: "linear-gradient(135deg,#a78bfa,#4c1d95)",
  },
  {
    id: "flux",
    name: "Flux",
    vendor: "Black Forest",
    kind: "image",
    tag: "Live stills",
    blurb: "High-detail product boards and box art tests.",
    href: "/image",
    gradient: "linear-gradient(135deg,#34d399,#0f766e)",
    live: true,
  },
  {
    id: "seedream",
    name: "Seedream",
    vendor: "ByteDance",
    kind: "image",
    tag: "Soon",
    blurb: "Still mockups before you animate — slot reserved.",
    href: "/models#soon",
    gradient: "linear-gradient(135deg,#f472b6,#7c3aed)",
  },
  {
    id: "nano-banana",
    name: "Nano Banana Pro",
    vendor: "Partner",
    kind: "image",
    tag: "Soon",
    blurb: "Fast concept stills for colorways — not live yet.",
    href: "/models#soon",
    gradient: "linear-gradient(135deg,#fbbf24,#f97316)",
  },
];

export const APPS: CatalogApp[] = [
  {
    id: "image-to-video",
    name: "Photo → Clip",
    emoji: "🎬",
    blurb: "One toy photo in, scroll-stopping video out.",
    href: createWorkbenchHref(),
    category: "video",
    live: true,
  },
  {
    id: "text-to-video",
    name: "Text → Video",
    emoji: "✍️",
    blurb: "Prompt-only (UI ready; photo path is live).",
    href: "/create?mode=t2v",
    category: "video",
  },
  {
    id: "cinema",
    name: "Cinema Studio",
    emoji: "🎥",
    blurb: "Lens & camera moves for premium figure shots.",
    href: "/cinema",
    category: "studio",
    live: true,
  },
  {
    id: "viral-presets",
    name: "Toy presets",
    emoji: "🧸",
    blurb: "Spin, unbox, dance, shelf pan — one tap.",
    href: "/effects",
    category: "video",
    live: true,
  },
  {
    id: "product-spin",
    name: "360° Spin",
    emoji: "🌀",
    blurb: "Turntable showcase for listings.",
    href: createJobRemixHref("etsy-listing"),
    category: "video",
    live: true,
  },
  {
    id: "unbox",
    name: "Blind-box reveal",
    emoji: "📦",
    blurb: "The open-box beat collectors stop for.",
    href: createJobRemixHref("blind-box-drop"),
    category: "video",
    live: true,
  },
  {
    id: "tiktok-hook",
    name: "TikTok Hook",
    emoji: "⚡",
    blurb: "9:16 flash motion for the first scroll-stop second.",
    href: createJobRemixHref("tiktok-hook"),
    category: "video",
    live: true,
  },
  {
    id: "seller-pack",
    name: "Seller Pack",
    emoji: "🛍️",
    blurb: "Listing + reveal + social from one photo.",
    href: createJobRemixHref("seller-pack"),
    category: "studio",
    live: true,
  },
  {
    id: "shelf-glam",
    name: "Shelf Glam",
    emoji: "✨",
    blurb: "Display-case hold for collectors and PDP.",
    href: createJobRemixHref("shelf-display"),
    category: "video",
    live: true,
  },
  {
    id: "image-studio",
    name: "Still studio",
    emoji: "🖼️",
    blurb: "Mock product photos before motion (Flux).",
    href: "/image",
    category: "image",
    live: true,
  },
  {
    id: "storyboard",
    name: "Storyboard",
    emoji: "📋",
    blurb: "Multi-shot board for a full drop video.",
    href: "/cinema",
    category: "studio",
    live: true,
  },
  {
    id: "supercomputer",
    name: "Batch agent",
    emoji: "🧠",
    blurb: "Whole-shop clip runs from one photo.",
    href: "/supercomputer",
    category: "studio",
    live: true,
  },
  {
    id: "face-swap",
    name: "Face swap",
    emoji: "🎭",
    blurb: "Optional edit tool — not live (suite placeholder).",
    href: "/apps#soon",
    category: "edit",
  },
  {
    id: "lipsync",
    name: "Lipsync",
    emoji: "🎙️",
    blurb: "Talking figure experiments — not live.",
    href: "/apps#soon",
    category: "edit",
  },
  {
    id: "upscale",
    name: "Upscale",
    emoji: "🔍",
    blurb: "Sharpen exports for shops — not live.",
    href: "/apps#soon",
    category: "edit",
  },
];

export function modelsByKind(kind: CatalogModel["kind"]) {
  return MODELS.filter((m) => m.kind === kind);
}

export function appsByCategory(cat: CatalogApp["category"]) {
  return APPS.filter((a) => a.category === cat);
}
