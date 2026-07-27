/**
 * Toy-native workflow mini-apps (Yiha /lego + HF Apps pattern).
 *
 * One registry powers Create WorkflowShelf, /apps catalog, and deep links.
 * No new video providers — each live workflow is a prefilled Create path.
 *
 * Legal parity: structure/IA only. No competitor copy or media.
 */

import {
  createJobRemixHref,
  createWorkbenchHref,
} from "@/lib/jobIntents";

export type WorkflowId =
  | "photo-to-clip"
  | "listing-spin"
  | "tiktok-hook"
  | "blind-box-drop"
  | "shelf-glam"
  | "seller-pack"
  | "toy-presets"
  | "still-studio"
  | "batch-agent";

export type Workflow = {
  id: WorkflowId;
  emoji: string;
  label: string;
  blurb: string;
  /** Primary deep link into a working surface */
  href: string;
  /** Optional job intent id for analytics / Create chip highlight */
  jobId?: string;
  effect?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  channel: "etsy" | "tiktok" | "reels" | "pdp" | "batch" | "studio";
  live: boolean;
  /** Short badge on cards */
  badge?: string;
  /** For /apps category grouping */
  category: "video" | "image" | "studio" | "edit";
};

/**
 * Live-first shelf. Order = product priority (seller jobs before generic).
 */
export const WORKFLOWS: Workflow[] = [
  {
    id: "listing-spin",
    emoji: "🌀",
    label: "Listing Spin",
    blurb: "1:1 packshot turntable for Etsy & shop galleries",
    href: createJobRemixHref("etsy-listing"),
    jobId: "etsy-listing",
    effect: "360-spin-showcase",
    aspectRatio: "1:1",
    channel: "etsy",
    live: true,
    badge: "Etsy",
    category: "video",
  },
  {
    id: "tiktok-hook",
    emoji: "⚡",
    label: "TikTok Hook",
    blurb: "9:16 flash motion for the first 1–2 seconds",
    href: createJobRemixHref("tiktok-hook"),
    jobId: "tiktok-hook",
    effect: "paparazzi-flash",
    aspectRatio: "9:16",
    channel: "tiktok",
    live: true,
    badge: "9:16",
    category: "video",
  },
  {
    id: "blind-box-drop",
    emoji: "📦",
    label: "Blind-box Drop",
    blurb: "Unbox beat for restocks and drop-day posts",
    href: createJobRemixHref("blind-box-drop"),
    jobId: "blind-box-drop",
    effect: "blind-box-unboxing",
    aspectRatio: "9:16",
    channel: "tiktok",
    live: true,
    badge: "Reveal",
    category: "video",
  },
  {
    id: "shelf-glam",
    emoji: "✨",
    label: "Shelf Glam",
    blurb: "Clean studio hold for collectors and PDP",
    href: createJobRemixHref("shelf-display"),
    jobId: "shelf-display",
    effect: "display-case-glam",
    aspectRatio: "9:16",
    channel: "pdp",
    live: true,
    badge: "PDP",
    category: "video",
  },
  {
    id: "seller-pack",
    emoji: "🛍️",
    label: "Seller Pack",
    blurb: "Listing + reveal + social from one photo",
    href: createJobRemixHref("seller-pack"),
    jobId: "seller-pack",
    effect: "360-spin-showcase",
    aspectRatio: "1:1",
    channel: "batch",
    live: true,
    badge: "3 clips",
    category: "studio",
  },
  {
    id: "photo-to-clip",
    emoji: "🎬",
    label: "Photo → Clip",
    blurb: "Full workbench — pick any recipe yourself",
    href: createWorkbenchHref(),
    channel: "studio",
    live: true,
    badge: "Open",
    category: "video",
  },
  {
    id: "toy-presets",
    emoji: "🧸",
    label: "Toy Presets",
    blurb: "Browse the full recipe wall",
    href: "/effects",
    channel: "studio",
    live: true,
    category: "video",
  },
  {
    id: "still-studio",
    emoji: "🖼️",
    label: "Still Studio",
    blurb: "Product boards before motion (Flux when live)",
    href: "/image",
    channel: "studio",
    /** Soft-nav: Image is Preview — not a live Seedance job block */
    live: false,
    badge: "Preview",
    category: "image",
  },
  {
    id: "batch-agent",
    emoji: "🧠",
    label: "Batch",
    blurb: "Queue multi-clip runs for the shop",
    href: "/supercomputer",
    channel: "batch",
    /** Soft-nav: Batch is Preview; Seller Pack is the live multi-clip path */
    live: false,
    badge: "Preview",
    category: "studio",
  },
];

/** Live = deep-links into Create / Seller Pack / Effects (real soft-launch jobs). */
export function listLiveWorkflows(): Workflow[] {
  return WORKFLOWS.filter((w) => w.live);
}

/** Preview shelves (Image / Batch) — honest capability tag, not empty doors. */
export function listPreviewWorkflows(): Workflow[] {
  return WORKFLOWS.filter((w) => !w.live);
}

export function getWorkflow(id: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}

/** Primary shelf for Create — job-first mini-apps only */
export function listCreateShelfWorkflows(): Workflow[] {
  return WORKFLOWS.filter((w) =>
    (
      [
        "listing-spin",
        "tiktok-hook",
        "blind-box-drop",
        "shelf-glam",
        "seller-pack",
        "photo-to-clip",
      ] as WorkflowId[]
    ).includes(w.id)
  );
}

/** Modules that bind this recipe (for effect landing cross-links). */
export function workflowsForEffect(effectSlug: string): Workflow[] {
  return WORKFLOWS.filter(
    (w) => w.live && w.effect === effectSlug && w.id !== "photo-to-clip"
  );
}

/** Fallback job modules when recipe has no dedicated block. */
export function listSellerJobWorkflows(): Workflow[] {
  return WORKFLOWS.filter((w) =>
    (
      [
        "listing-spin",
        "tiktok-hook",
        "blind-box-drop",
        "shelf-glam",
        "seller-pack",
      ] as WorkflowId[]
    ).includes(w.id)
  );
}
