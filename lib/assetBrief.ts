/**
 * Creative Director Phase B — rule-based Asset Brief (not cloud vision).
 *
 * Physics: we only know image geometry + selected recipe/job + optional bible.
 * Honesty: never claim AI saw paint lines or logos from the photo.
 */

import type { JobIntentId } from "@/lib/jobIntents";
import type { ToyIdentity } from "@/lib/toyIdentity";

export type ImageProbe = {
  width: number;
  height: number;
};

export type AssetBriefInput = {
  hasImage: boolean;
  probe: ImageProbe | null;
  effect: string;
  jobId?: JobIntentId | null;
  identity: ToyIdentity;
  /** Official Lab sample — brief is illustrative only */
  labSample?: boolean;
};

export type BriefBullet = {
  id: string;
  text: string;
  tone?: "ok" | "warn" | "tip";
};

export type BriefRecipeHint = {
  slug: string;
  label: string;
  reason: string;
};

export type AssetBrief = {
  /** Always true when hasImage — UI gate */
  ready: boolean;
  title: string;
  disclaimer: string;
  bullets: BriefBullet[];
  /** Suggested recipes (max 3) for one-tap apply */
  recipes: BriefRecipeHint[];
  /** Suggested commercial goal deep link */
  sellerPackHref: string;
  shape: "square" | "portrait" | "landscape" | "unknown";
  aspectLabel: string;
};

function classifyShape(
  probe: ImageProbe | null
): "square" | "portrait" | "landscape" | "unknown" {
  if (!probe || probe.width < 8 || probe.height < 8) return "unknown";
  const r = probe.width / probe.height;
  if (r >= 0.9 && r <= 1.12) return "square";
  if (r < 0.9) return "portrait";
  return "landscape";
}

function aspectLabel(probe: ImageProbe | null, shape: AssetBrief["shape"]): string {
  if (!probe || shape === "unknown") return "aspect unknown";
  const g = gcd(probe.width, probe.height);
  const a = Math.round(probe.width / g);
  const b = Math.round(probe.height / g);
  // Collapse huge primes to friendly labels
  if (shape === "square") return `~1:1 (${probe.width}×${probe.height})`;
  if (shape === "portrait") {
    if (Math.abs(probe.width / probe.height - 9 / 16) < 0.08) {
      return `~9:16 (${probe.width}×${probe.height})`;
    }
    return `portrait ~${a}:${b} (${probe.width}×${probe.height})`;
  }
  if (Math.abs(probe.width / probe.height - 16 / 9) < 0.08) {
    return `~16:9 (${probe.width}×${probe.height})`;
  }
  return `landscape ~${a}:${b} (${probe.width}×${probe.height})`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Probe natural size from a data URL or same-origin image URL. */
export function probeImageSize(src: string): Promise<ImageProbe | null> {
  if (typeof window === "undefined" || !src) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (v: ImageProbe | null) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const t = window.setTimeout(() => done(null), 2500);
    img.onload = () => {
      window.clearTimeout(t);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w > 0 && h > 0) done({ width: w, height: h });
      else done(null);
    };
    img.onerror = () => {
      window.clearTimeout(t);
      done(null);
    };
    img.src = src;
  });
}

/**
 * Build a Creative Director brief from geometry + product context.
 * Pure / deterministic — safe for smoke tests.
 */
export function buildAssetBrief(input: AssetBriefInput): AssetBrief {
  const shape = classifyShape(input.probe);
  const label = aspectLabel(input.probe, shape);
  const sellerPackHref = "/create?mode=seller-pack";

  if (!input.hasImage) {
    return {
      ready: false,
      title: "Asset Brief",
      disclaimer:
        "Rule-based Creative Director brief · not cloud vision · upload a photo first.",
      bullets: [],
      recipes: [],
      sellerPackHref,
      shape,
      aspectLabel: label,
    };
  }

  const bullets: BriefBullet[] = [];

  if (input.labSample) {
    bullets.push({
      id: "lab",
      text: "Official Lab still — good for feeling a recipe; live Mini uses this sample, not a customer SKU.",
      tone: "tip",
    });
  } else {
    bullets.push({
      id: "rights",
      text: "Sales mode: only animate toys you own or have rights to. Confirm ownership before generate.",
      tone: "warn",
    });
  }

  bullets.push({
    id: "shape",
    text:
      shape === "square"
        ? `Photo is ${label} — strong fit for Listing · 360° Spin (1:1 marketplace gallery).`
        : shape === "portrait"
          ? `Photo is ${label} — strong fit for Box Reveal or Social Hook (9:16 feeds).`
          : shape === "landscape"
            ? `Photo is ${label} — strong fit for Display Glow / shelf pans (16:9 PDP).`
            : "Could not read pixel size — a front-facing, well-lit shot still works for any recipe.",
    tone: "ok",
  });

  bullets.push({
    id: "fidelity",
    text: "Fidelity checklist: sharp edges, clean paint splits, logo readable, plain or soft studio background. Soft/blurry photos lose sculpt detail in motion.",
    tone: "tip",
  });

  if (input.identity.sku || input.identity.preserve) {
    bullets.push({
      id: "bible",
      text: `Character bible draft active${
        input.identity.sku ? ` · ${input.identity.sku}` : ""
      }${
        input.identity.preserve
          ? ` · preserve: ${input.identity.preserve}`
          : ""
      }. Remakes will append this lock to the motion prompt.`,
      tone: "ok",
    });
  } else {
    bullets.push({
      id: "bible-empty",
      text: "Optional character bible: name the SKU and list paint/logo lines to preserve — helps multi-clip consistency without cloud Soul ID.",
      tone: "tip",
    });
  }

  bullets.push({
    id: "pack",
    text: "Commercial default: Seller Pack (Launch Pack) = listing spin + box reveal + social hook from this still.",
    tone: "ok",
  });

  const recipes: BriefRecipeHint[] = [];
  if (shape === "square" || shape === "unknown") {
    recipes.push({
      slug: "360-spin-showcase",
      label: "360° Spin",
      reason: "Listing packshot",
    });
    recipes.push({
      slug: "floating-hero",
      label: "Zero-G Float",
      reason: "Hero / ad open",
    });
  }
  if (shape === "portrait" || shape === "unknown") {
    recipes.push({
      slug: "blind-box-unboxing",
      label: "Box Reveal",
      reason: "Drop / restock",
    });
    recipes.push({
      slug: "paparazzi-flash",
      label: "Social Hook",
      reason: "First-second feed",
    });
  }
  if (shape === "landscape" || shape === "unknown") {
    recipes.push({
      slug: "display-case-glam",
      label: "Display Glow",
      reason: "Shelf / PDP",
    });
  }
  // Always ensure current effect is not the only option; cap 3 unique
  const seen = new Set<string>();
  const unique = recipes.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  }).slice(0, 3);

  // Prefer not-current recipe first if possible for discovery
  unique.sort((a, b) => {
    if (a.slug === input.effect) return 1;
    if (b.slug === input.effect) return -1;
    return 0;
  });

  return {
    ready: true,
    title: "Creative Director · Asset Brief",
    disclaimer:
      "Rule-based brief from photo shape + product rules · not computer vision · review fidelity yourself.",
    bullets: bullets.slice(0, 5),
    recipes: unique,
    sellerPackHref,
    shape,
    aspectLabel: label,
  };
}
