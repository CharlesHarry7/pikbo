/**
 * Library guest → login deep-link restore (AIT-115).
 *
 * Primary carrier is `/login?next=…`. Guest without a job keeps the static
 * contract `href="/login?next=/library"` (engine-smoke / launch-pack). Guest
 * with a UUID job restores `/library?job=<uuid>` after auth — ownership is
 * enforced on Library (owned select / not-your-toy fail-closed). Never put
 * product names, media URLs, or owner metadata into `next`.
 *
 * Pure module (no path-alias imports) so node --experimental-strip-types
 * regressions can import it without a bundler.
 */

/** UUID shape for deep-link job ids — reject freeform paths/secrets. */
export const LIBRARY_JOB_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Static guest-without-job login contract (keep literal for source smoke). */
export const LIBRARY_LOGIN_HREF_STATIC = "/login?next=/library" as const;

/** Library shelf path with no job focus. */
export const LIBRARY_PATH = "/library" as const;

/**
 * Accept only UUID-shaped job ids for deep links. Invalid/missing → null
 * (guest login falls back to static `/login?next=/library`).
 */
export function parseLibraryJobId(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const id = raw.trim();
  if (!id || id.length > 64) return null;
  if (/[\u0000-\u001f\u007f]/.test(id)) return null;
  return LIBRARY_JOB_ID_RE.test(id) ? id : null;
}

/**
 * Same-origin Library return path after auth. Only `job` (UUID) is allowed —
 * no effect labels, media fields, or other metadata in the redirect.
 */
export function libraryReturnPath(
  jobId?: string | null | undefined
): string {
  const id = parseLibraryJobId(jobId);
  if (!id) return LIBRARY_PATH;
  return `${LIBRARY_PATH}?job=${encodeURIComponent(id)}`;
}

/**
 * Guest Sign-in href from Library.
 * - No / invalid job → static `/login?next=/library` (engine-smoke contract)
 * - Valid UUID → `/login?next=<encoded /library?job=uuid>`
 */
export function libraryLoginHref(
  jobId?: string | null | undefined
): string {
  const id = parseLibraryJobId(jobId);
  if (!id) return LIBRARY_LOGIN_HREF_STATIC;
  return `/login?next=${encodeURIComponent(libraryReturnPath(id))}`;
}

/**
 * True when `next` is a Library shelf restore (bare `/library` or UUID job).
 * Used by pure regressions — runtime auth still uses sanitizeInternalNextPath.
 */
export function isLibraryReturnPath(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const base = new URL("https://pikbo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return false;
    if (parsed.pathname !== LIBRARY_PATH) return false;
    const keys = [...parsed.searchParams.keys()];
    if (keys.length === 0) return true;
    if (keys.length === 1 && keys[0] === "job") {
      return parseLibraryJobId(parsed.searchParams.get("job")) !== null;
    }
    return false;
  } catch {
    return false;
  }
}
