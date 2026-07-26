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
 * Optional overrides from a real generation/history record.
 * Recipe defaults apply when fields are missing or invalid.
 * Used so Retry / Remake reopen Create with the same ratio/duration/channel
 * the user already ran (not only the preset default).
 */
export type RemixHrefOpts = {
  ratio?: string;
  duration?: number | string;
  channel?: string;
};

/** Pick validated remix overrides from a job or device-history row. */
export function remixOptsFromRecord(r: {
  aspectRatio?: string;
  duration?: number | string;
  channel?: string;
}): RemixHrefOpts {
  return {
    ratio: r.aspectRatio,
    duration: r.duration,
    channel: r.channel,
  };
}

/**
 * Library / Explore remake deep link.
 * Optional sku keeps Toy Identity label on Create (device-local bible, not Soul ID).
 * Optional opts carry actual job ratio/duration/channel when known.
 */
export function createRemixHref(
  recipeSlug: string,
  sourceId?: string,
  sku?: string | null,
  opts?: RemixHrefOpts
): string {
  const intent = remixIntentFromRecipe(recipeSlug, sourceId);
  let base: string;
  if (intent) {
    let aspectRatio = intent.aspectRatio;
    if (
      opts?.ratio === "9:16" ||
      opts?.ratio === "16:9" ||
      opts?.ratio === "1:1"
    ) {
      aspectRatio = opts.ratio;
    }
    let durationSeconds = intent.durationSeconds;
    const d =
      typeof opts?.duration === "string"
        ? Number(opts.duration)
        : opts?.duration;
    if (d === 5 || d === 10) {
      durationSeconds = d;
    }
    let channel = intent.channel;
    if (opts?.channel && (CHANNELS as string[]).includes(opts.channel)) {
      channel = opts.channel as RemixChannel;
    } else if (aspectRatio !== intent.aspectRatio) {
      // Aspect changed without explicit channel — re-pick marketplace vs social.
      channel = channelForPreset(intent.recipeSlug, aspectRatio);
    }
    base = buildCreateRemixHref({
      ...intent,
      aspectRatio,
      durationSeconds,
      channel,
    });
  } else {
    // Unknown recipe — still append validated ratio/duration so Create can honor them.
    const q = new URLSearchParams({
      effect: recipeSlug,
    });
    if (
      opts?.ratio === "9:16" ||
      opts?.ratio === "16:9" ||
      opts?.ratio === "1:1"
    ) {
      q.set("ratio", opts.ratio);
    }
    const d =
      typeof opts?.duration === "string"
        ? Number(opts.duration)
        : opts?.duration;
    if (d === 5 || d === 10) q.set("duration", String(d));
    if (opts?.channel && (CHANNELS as string[]).includes(opts.channel)) {
      q.set("channel", opts.channel);
    }
    base = `/create?${q.toString()}`;
  }
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
