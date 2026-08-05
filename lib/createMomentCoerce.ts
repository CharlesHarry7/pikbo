/**
 * Defense-in-depth for legacy / external Create deep links.
 *
 * Product CTAs should already use MOMENT_CREATE_HREF (mode=moment&effect=
 * street-power-up). Bookmarks, emails, and residual CTAs may still hit bare
 * `effect=street-power-up` without mode=moment. Coerce those into the fixed
 * Moment contract so honesty does not depend on every surface being updated.
 *
 * Generate→360 (`effect=360-spin-showcase` / remix params) is never rewritten.
 *
 * Keep this module free of path aliases so source smokes can import it via
 * `node --experimental-strip-types`.
 */

/** Same fixed path as softLaunch.MOMENT_CREATE_HREF (keep in sync). */
export const MOMENT_CREATE_HREF =
  "/create?mode=moment&effect=street-power-up" as const;

export const FIXED_MOMENT_EFFECT = "street-power-up" as const;
export const FIXED_MOMENT_MODE = "moment" as const;

/** Intent params preserved across bare street-power-up → mode=moment redirect. */
export const MOMENT_COERCE_PRESERVE_KEYS = [
  "source",
  "sku",
  "try",
  "sample",
  "job",
  "channel",
  "retryJobId",
  "retryToken",
  "checkout",
  "session_id",
  "assetId",
] as const;

export type CreateSearchLike = Record<
  string,
  string | string[] | undefined
>;

function firstString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/**
 * When `effect=street-power-up` and `mode` is absent or not `moment`, return
 * the fixed Moment deep link with preserved intent params. Returns `null`
 * when already honest or when the query is not a Street Power-Up deep link
 * (including Generate→360 remixes).
 */
export function coerceBareStreetPowerUpToMomentHref(
  sp: CreateSearchLike
): string | null {
  const effect = firstString(sp.effect)?.trim();
  if (effect !== FIXED_MOMENT_EFFECT) return null;

  const mode = firstString(sp.mode)?.trim();
  if (mode === FIXED_MOMENT_MODE) return null;

  const q = new URLSearchParams();
  // Fixed contract first so the path always matches MOMENT_CREATE_HREF prefix.
  q.set("mode", FIXED_MOMENT_MODE);
  q.set("effect", FIXED_MOMENT_EFFECT);

  for (const key of MOMENT_COERCE_PRESERVE_KEYS) {
    const raw = firstString(sp[key])?.trim();
    if (!raw) continue;
    const max =
      key === "sku" || key === "source" || key === "sample" || key === "job"
        ? 64
        : 128;
    q.set(key, raw.slice(0, max));
  }

  const href = `/create?${q.toString()}`;
  // Guard: coerced destination must always begin with the shared Moment href.
  if (!href.startsWith(MOMENT_CREATE_HREF)) {
    return MOMENT_CREATE_HREF;
  }
  return href;
}
