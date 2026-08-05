/**
 * /create product-contract router.
 *
 * Soft-launch default is the fixed Street Power-Up Moment. Generate doors
 * (createGenerate360Href → effect=360-spin-showcase) and other registered
 * remix deep links must open the Generate workbench — not silently coerce
 * into the Moment UI.
 *
 * Keep free of path aliases so source smokes can import it via
 * `node --experimental-strip-types`.
 */

// Explicit .ts suffix: Node --experimental-strip-types cannot resolve bare
// extensionless neighbors; Next/tsc still resolve this under bundler mode.
import { getPreset } from "./presets.ts";

/** Keep in sync with lib/jobIntents.GENERATE_360_EFFECT. */
export const GENERATE_360_EFFECT = "360-spin-showcase" as const;
export const FIXED_MOMENT_EFFECT = "street-power-up" as const;
export const FIXED_MOMENT_MODE = "moment" as const;

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
  return Boolean(getPreset(slug));
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
