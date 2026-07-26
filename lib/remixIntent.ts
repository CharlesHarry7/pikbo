/**
 * Remix handoff contract — docs/prd/RETENTION_REMIX_LOOP.md §6
 * Canonical deep link: /create?effect=&source=&ratio=&duration=&channel=
 */
import { PRESETS, getPreset } from "@/lib/presets";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { viralName } from "@/lib/viralNames";

export type RemixChannel =
  | "etsy"
  | "whatnot"
  | "tiktok"
  | "reels"
  | "shorts"
  | "pdp";

export type RemixIntent = {
  sourceProjectSlug: string;
  recipeSlug: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds: 5 | 10;
  channel: RemixChannel;
  promptHint?: string;
};

const CHANNELS: RemixChannel[] = [
  "etsy",
  "whatnot",
  "tiktok",
  "reels",
  "shorts",
  "pdp",
];

function channelForPreset(slug: string, aspect: "9:16" | "16:9" | "1:1"): RemixChannel {
  if (slug.includes("blind") || slug.includes("mystery") || slug.includes("unbox")) {
    return "tiktok";
  }
  if (aspect === "1:1" || slug.includes("spin") || slug.includes("360")) {
    return "etsy";
  }
  if (aspect === "16:9") return "pdp";
  return "reels";
}

/** Build RemixIntent from a registered recipe + optional demo project id. */
export function remixIntentFromRecipe(
  recipeSlug: string,
  sourceProjectSlug?: string
): RemixIntent | null {
  const preset = getPreset(recipeSlug);
  if (!preset) return null;
  const aspect: RemixIntent["aspectRatio"] =
    preset.aspectRatio === "16:9" || preset.aspectRatio === "1:1"
      ? preset.aspectRatio
      : "9:16";
  const duration: 5 | 10 = preset.duration === 10 ? 10 : 5;
  const source =
    sourceProjectSlug ||
    DEMO_VIDEOS.find((d) => d.preset === recipeSlug)?.id ||
    recipeSlug;
  return {
    sourceProjectSlug: source,
    recipeSlug: preset.slug,
    aspectRatio: aspect,
    durationSeconds: duration,
    channel: channelForPreset(preset.slug, aspect),
    promptHint: preset.promptTemplate?.slice(0, 160),
  };
}

export function buildCreateRemixHref(intent: RemixIntent): string {
  const q = new URLSearchParams({
    effect: intent.recipeSlug,
    source: intent.sourceProjectSlug,
    ratio: intent.aspectRatio,
    duration: String(intent.durationSeconds),
    channel: intent.channel,
  });
  return `/create?${q.toString()}`;
}

/**
 * Library / Explore remake deep link.
 * Optional sku keeps Toy Identity label on Create (device-local bible, not Soul ID).
 */
export function createRemixHref(
  recipeSlug: string,
  sourceId?: string,
  sku?: string | null
): string {
  const intent = remixIntentFromRecipe(recipeSlug, sourceId);
  const base = intent
    ? buildCreateRemixHref(intent)
    : `/create?effect=${encodeURIComponent(recipeSlug)}`;
  const cleanSku = (sku || "").trim().slice(0, 64);
  if (!cleanSku) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}sku=${encodeURIComponent(cleanSku)}`;
}

export type ParsedRemixQuery = {
  intent: RemixIntent | null;
  notices: string[];
  sourceLabel: string | null;
  sourcePoster: string | null;
};

export type RemixSearchParams = {
  effect?: string;
  source?: string;
  ratio?: string;
  duration?: string;
  channel?: string;
};

/** A plain /create visit is a new job, never an implicit remix of PRESETS[0]. */
export function hasRemixSearchParams(sp: RemixSearchParams): boolean {
  return Boolean(
    sp.effect || sp.source || sp.ratio || sp.duration || sp.channel
  );
}

/** Parse /create query params; invalid values ignored with notices. */
export function parseRemixSearchParams(sp: RemixSearchParams): ParsedRemixQuery {
  const notices: string[] = [];
  if (!hasRemixSearchParams(sp)) {
    return { intent: null, notices, sourceLabel: null, sourcePoster: null };
  }
  const recipeSlug =
    sp.effect && PRESETS.some((p) => p.slug === sp.effect)
      ? sp.effect
      : undefined;
  if (sp.effect && !recipeSlug) {
    notices.push(`Unknown recipe “${sp.effect}” — showing a default.`);
  }

  const base = remixIntentFromRecipe(
    recipeSlug || PRESETS[0].slug,
    sp.source
  );
  if (!base) {
    return { intent: null, notices, sourceLabel: null, sourcePoster: null };
  }

  let aspectRatio = base.aspectRatio;
  if (sp.ratio === "9:16" || sp.ratio === "16:9" || sp.ratio === "1:1") {
    aspectRatio = sp.ratio;
  } else if (sp.ratio) {
    notices.push("Invalid ratio ignored.");
  }

  let durationSeconds = base.durationSeconds;
  if (sp.duration === "5" || sp.duration === "10") {
    durationSeconds = Number(sp.duration) as 5 | 10;
  } else if (sp.duration) {
    notices.push("Invalid duration ignored.");
  }

  let channel = base.channel;
  if (sp.channel && (CHANNELS as string[]).includes(sp.channel)) {
    channel = sp.channel as RemixChannel;
  } else if (sp.channel) {
    notices.push("Invalid channel ignored.");
  }

  const demo =
    DEMO_VIDEOS.find((d) => d.id === sp.source) ||
    DEMO_VIDEOS.find((d) => d.preset === base.recipeSlug);

  const intent: RemixIntent = {
    ...base,
    recipeSlug: base.recipeSlug,
    aspectRatio,
    durationSeconds,
    channel,
  };

  return {
    intent,
    notices,
    sourceLabel: demo
      ? `${demo.character} · ${viralName(demo.preset, demo.title)}`
      : recipeSlug
        ? viralName(recipeSlug, recipeSlug)
        : null,
    sourcePoster: demo?.poster ?? null,
  };
}
