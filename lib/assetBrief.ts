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

export type BriefLocale = "en" | "zh";

export type AssetBriefInput = {
  hasImage: boolean;
  probe: ImageProbe | null;
  effect: string;
  jobId?: JobIntentId | null;
  identity: ToyIdentity;
  /** PIKBO Lab prototype sample — brief is illustrative only */
  labSample?: boolean;
  /** Dynamic bullet language (EN default; ZH for 简体中文) */
  locale?: BriefLocale;
  /** Phase C-lite: claimed angles / secondary still */
  fidelityAngles?: string[];
  hasSecondaryStill?: boolean;
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
  /**
   * Best single recipe for this shape (stable — not reordered by current effect).
   * Used for soft auto-apply on first upload (Phase B2).
   */
  primaryRecipe: BriefRecipeHint | null;
  /** Suggested commercial goal deep link */
  sellerPackHref: string;
  shape: "square" | "portrait" | "landscape" | "unknown";
  aspectLabel: string;
};

/** Shape → default commercial recipe (Creative Director soft apply). */
export function primaryRecipeForShape(
  shape: AssetBrief["shape"],
  locale: BriefLocale = "en"
): BriefRecipeHint {
  const zh = locale === "zh";
  if (shape === "portrait") {
    return {
      slug: "blind-box-unboxing",
      label: zh ? "开箱揭晓" : "Box Reveal",
      reason: zh ? "竖图 · 发售 / 社媒" : "Portrait · drop / social",
    };
  }
  if (shape === "landscape") {
    return {
      slug: "display-case-glam",
      label: zh ? "陈列光感" : "Display Glow",
      reason: zh ? "横图 · 晒柜 / 详情页" : "Landscape · shelf / PDP",
    };
  }
  // square + unknown → listing spin is the commercial default
  return {
    slug: "360-spin-showcase",
    label: zh ? "360° 旋转" : "360° Spin",
    reason: zh ? "上架主图默认" : "Listing packshot default",
  };
}

/** Optional material chips that append into Toy Identity preserve. */
export const BIBLE_MATERIAL_CHIPS = [
  "PVC",
  "Sofubi",
  "Resin",
  "Flocking",
  "Metallic paint",
  "Translucent parts",
] as const;

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
 * Pure / deterministic — safe for smoke tests. Locale: en | zh.
 */
export function buildAssetBrief(input: AssetBriefInput): AssetBrief {
  const locale: BriefLocale = input.locale === "zh" ? "zh" : "en";
  const zh = locale === "zh";
  const shape = classifyShape(input.probe);
  const label = aspectLabel(input.probe, shape);
  const sellerPackHref = "/create?effect=street-power-up";

  if (!input.hasImage) {
    return {
      ready: false,
      title: zh ? "资产简报" : "Asset Brief",
      disclaimer: zh
        ? "基于画幅与产品规则的创意总监简报 · 非云端识图 · 请先上传照片。"
        : "Rule-based Creative Director brief · not cloud vision · upload a photo first.",
      bullets: [],
      recipes: [],
      primaryRecipe: null,
      sellerPackHref,
      shape,
      aspectLabel: label,
    };
  }

  const bullets: BriefBullet[] = [];

  if (input.labSample) {
    bullets.push({
      id: "lab",
      text: zh
        ? "官方实验室样片 —— 适合试配方；实时 Mini 用的是样片，不是客户 SKU。"
        : "PIKBO Lab reference still — useful for previewing a recipe; it is not a customer SKU or verified provider input.",
      tone: "tip",
    });
  } else {
    bullets.push({
      id: "rights",
      text: zh
        ? "卖货模式：只动画化你拥有或有权使用的玩具。生成前请确认权属。"
        : "Sales mode: only animate toys you own or have rights to. Confirm ownership before generate.",
      tone: "warn",
    });
  }

  bullets.push({
    id: "shape",
    text:
      shape === "square"
        ? zh
          ? `照片为 ${label} —— 适合上架 · 360° 旋转（1:1 电商轮播）。`
          : `Photo is ${label} — strong fit for Listing · 360° Spin (1:1 marketplace gallery).`
        : shape === "portrait"
          ? zh
            ? `照片为 ${label} —— 适合开箱揭晓或社媒钩子（9:16 信息流）。`
            : `Photo is ${label} — strong fit for Box Reveal or Social Hook (9:16 feeds).`
          : shape === "landscape"
            ? zh
              ? `照片为 ${label} —— 适合陈列光感 / 货架扫镜（16:9 详情页）。`
              : `Photo is ${label} — strong fit for Display Glow / shelf pans (16:9 PDP).`
            : zh
              ? "未能读取像素尺寸 —— 正面、光线干净的照片仍适合任意配方。"
              : "Could not read pixel size — a front-facing, well-lit shot still works for any recipe.",
    tone: "ok",
  });

  bullets.push({
    id: "fidelity",
    text: zh
      ? "保真清单：边缘锐利、漆面分隔干净、logo 可读、背景简洁。模糊照片会在运动中丢造型细节。"
      : "Fidelity checklist: sharp edges, clean paint splits, logo readable, plain or soft studio background. Soft/blurry photos lose sculpt detail in motion.",
    tone: "tip",
  });

  if (input.identity.sku || input.identity.preserve) {
    bullets.push({
      id: "bible",
      text: zh
        ? `角色圣经草案已启用${
            input.identity.sku ? ` · ${input.identity.sku}` : ""
          }${
            input.identity.preserve
              ? ` · 必保：${input.identity.preserve}`
              : ""
          }。重做时会写入运动提示词。`
        : `Character bible draft active${
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
      text: zh
        ? "可选角色圣经：填写 SKU 与必保漆线/logo —— 多片一致，不是云端 Soul ID。"
        : "Optional character bible: name the SKU and list paint/logo lines to preserve — helps multi-clip consistency without cloud Soul ID.",
      tone: "tip",
    });
  }

  const angles = (input.fidelityAngles ?? []).filter(Boolean);
  if (angles.length > 0 || input.hasSecondaryStill) {
    bullets.push({
      id: "refs",
      text: zh
        ? `保真参考（C-lite）：${
            angles.length ? `角度 ${angles.join("、")}` : "未标角度"
          }${
            input.hasSecondaryStill
              ? " · 已附第二张细节图（仅工作室预览，不送多图模型）"
              : ""
          }。不是真 Soul ID 训练。`
        : `Fidelity refs (C-lite): ${
            angles.length ? `angles ${angles.join(", ")}` : "no angles tagged"
          }${
            input.hasSecondaryStill
              ? " · secondary detail still attached (client preview only, not multi-image model input)"
              : ""
          }. Not a true Soul ID train.`,
      tone: "ok",
    });
  }

  bullets.push({
    id: "pack",
    text: zh
      ? "商用默认：先选一个最符合当下发布目的的动效，不强制一次生成三条。"
      : "Commercial default: choose the one directed Moment that fits this launch; public creation never forces a three-clip bundle.",
    tone: "ok",
  });

  const recipes: BriefRecipeHint[] = [];
  if (shape === "square" || shape === "unknown") {
    recipes.push({
      slug: "360-spin-showcase",
      label: zh ? "360° 旋转" : "360° Spin",
      reason: zh ? "上架主图" : "Listing packshot",
    });
    recipes.push({
      slug: "floating-hero",
      label: zh ? "零重力漂浮" : "Zero-G Float",
      reason: zh ? "主视觉 / 广告开场" : "Hero / ad open",
    });
  }
  if (shape === "portrait" || shape === "unknown") {
    recipes.push({
      slug: "blind-box-unboxing",
      label: zh ? "开箱揭晓" : "Box Reveal",
      reason: zh ? "发售 / 补货" : "Drop / restock",
    });
    recipes.push({
      slug: "paparazzi-flash",
      label: zh ? "社媒钩子" : "Social Hook",
      reason: zh ? "信息流前一秒" : "First-second feed",
    });
  }
  if (shape === "landscape" || shape === "unknown") {
    recipes.push({
      slug: "display-case-glam",
      label: zh ? "陈列光感" : "Display Glow",
      reason: zh ? "晒柜 / 详情页" : "Shelf / PDP",
    });
  }
  // Always ensure current effect is not the only option; cap 3 unique
  const seen = new Set<string>();
  const unique = recipes.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  }).slice(0, 3);

  const primaryRecipe = primaryRecipeForShape(shape, locale);
  // Ensure primary is always present in the chip list
  if (!seen.has(primaryRecipe.slug)) {
    unique.unshift(primaryRecipe);
    seen.add(primaryRecipe.slug);
  }
  // Prefer not-current recipe first if possible for discovery (primary stays if match)
  unique.sort((a, b) => {
    if (a.slug === primaryRecipe.slug) return -1;
    if (b.slug === primaryRecipe.slug) return 1;
    if (a.slug === input.effect) return 1;
    if (b.slug === input.effect) return -1;
    return 0;
  });

  return {
    ready: true,
    title: zh ? "创意总监 · 资产简报" : "Creative Director · Asset Brief",
    disclaimer: zh
      ? "基于画幅 + 产品规则 · 非计算机视觉 · 请自行核对保真。"
      : "Rule-based brief from photo shape + product rules · not computer vision · review fidelity yourself.",
    bullets: bullets.slice(0, 6),
    recipes: unique.slice(0, 3),
    primaryRecipe,
    sellerPackHref,
    shape,
    aspectLabel: label,
  };
}
