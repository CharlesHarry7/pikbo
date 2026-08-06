/**
 * /create product-contract router.
 *
 * Soft-launch default is the fixed Street Power-Up Moment. Generate doors
 * (createGenerate360Href → effect=360-spin-showcase) and other registered
 * remix deep links must open the Generate workbench — not silently coerce
 * into the Moment UI.
 *
 * Pure module (no neighbor imports) so source smokes can load it via
 * `node --experimental-strip-types` and tsc (moduleResolution bundler)
 * both succeed. WORKBENCH_EFFECT_SLUGS must stay in sync with PRESETS
 * minus street-power-up (create-route-360-smoke asserts parity).
 */

/** Keep in sync with lib/jobIntents.GENERATE_360_EFFECT. */
export const GENERATE_360_EFFECT = "360-spin-showcase" as const;
export const FIXED_MOMENT_EFFECT = "street-power-up" as const;
export const FIXED_MOMENT_MODE = "moment" as const;

/**
 * Registered remix effects that open the Generate workbench.
 * Excludes FIXED_MOMENT_EFFECT. Mirror of PRESETS slugs in lib/presets.ts.
 */
export const WORKBENCH_EFFECT_SLUGS: readonly string[] = [
  "360-spin-showcase",
  "display-case-glam",
  "floating-hero",
  "collection-shelf-pan",
  "blind-box-unboxing",
  "mystery-box-reveal",
  "claw-machine-win",
  "make-figure-dance",
  "make-figure-walk",
  "toy-wave-hello",
  "plushie-comes-alive",
  "stop-motion-style",
  "miniature-scene",
  "festive-snow",
  "neon-city-night",
  "assemble-reveal",
  "paparazzi-flash",
  "kaiju-rampage",
  "smoke-burst-entrance",
  "paint-splash",
  "power-aura",
  "hologram-glitch",
  "melt-and-reform",
  "bullet-time-orbit",
  "desk-adventure",
  "confetti-drop-reveal",
  "snow-globe-world",
];

const WORKBENCH_SLUG_SET = new Set(WORKBENCH_EFFECT_SLUGS);

export type CreateRouteContract = "fixed-moment" | "generate-workbench";

export type CreateSearchLike = {
  effect?: string | string[];
  mode?: string | string[];
};

function firstString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/**
 * True when the query is an honest Generate remix (registered preset other
 * than street-power-up) and not an explicit Moment mode.
 */
export function isGenerateWorkbenchEffect(
  effect: string | undefined
): boolean {
  const slug = (effect || "").trim();
  if (!slug || slug === FIXED_MOMENT_EFFECT) return false;
  return WORKBENCH_SLUG_SET.has(slug);
}

/**
 * Resolve which product contract /create should mount.
 *
 * Priority:
 * 1. mode=moment → fixed Moment (AIT-140)
 * 2. registered non-street-power-up effect → Generate workbench (AIT-142)
 * 3. default / bare street-power-up / unknown → fixed Moment
 */
export function resolveCreateRouteContract(
  sp: CreateSearchLike
): CreateRouteContract {
  const mode = firstString(sp.mode)?.trim();
  if (mode === FIXED_MOMENT_MODE) return "fixed-moment";

  const effect = firstString(sp.effect)?.trim();
  if (isGenerateWorkbenchEffect(effect)) return "generate-workbench";

  return "fixed-moment";
}

/** True for the canonical Generate→360 deep link (createGenerate360Href). */
export function isGenerate360Effect(effect: string | undefined): boolean {
  return (effect || "").trim() === GENERATE_360_EFFECT;
}

/**
 * Home Generate→360 entry sources (createGenerate360Href tags).
 * These are surface analytics tags — not Lab project remix ids.
 * AIT-459/AIT-473: first-run workbench must stay Lab sample / Live gated honest.
 *
 * AIT-462 money doors (must all be recognized so workbench never treats them
 * as Lab project remix ids or `/projects/{source}` links):
 * - home-hero, app-shell-home, home-trust, home-gallery-pedestal
 * Also: home-explore-rail (Lab explore listing-spin entry).
 */
export const HOME_GENERATE_ENTRY_SOURCES = [
  "home-hero",
  "app-shell-home",
  "home-trust",
  "home-gallery-pedestal",
  "home-explore-rail",
] as const;

export type HomeGenerateEntrySource =
  (typeof HOME_GENERATE_ENTRY_SOURCES)[number];

const HOME_GENERATE_ENTRY_SET = new Set<string>(HOME_GENERATE_ENTRY_SOURCES);

/** True when `source` is a Home Generate door tag (not a project slug). */
export function isHomeGenerateEntrySource(
  source: string | undefined
): source is HomeGenerateEntrySource {
  return HOME_GENERATE_ENTRY_SET.has((source || "").trim());
}

/** Short eyebrow for the CreateStudio home-entry honesty strip. */
export function homeGenerateEntryLabel(
  source: string | undefined
): string {
  switch ((source || "").trim()) {
    case "home-hero":
      return "From Home · Generate 360°";
    case "app-shell-home":
      return "From Home · nav Generate";
    case "home-trust":
      return "From Home · trust Generate 360°";
    case "home-gallery-pedestal":
      return "From Home · gallery pedestal";
    case "home-explore-rail":
      return "From Home · Lab explore rail";
    default:
      return "From Home · Generate 360°";
  }
}

/**
 * Workbench first-run honesty line for Generate→360 (and home doors).
 * Lab samples are always 0-credit cached prototypes; Live stays gated —
 * never sell Free Mini as an open public trial on entry.
 */
export const WORKBENCH_LAB_LIVE_HONESTY =
  "Lab sample · 0 credits · Live gated · not Free Mini open trial" as const;
