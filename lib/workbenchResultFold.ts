/**
 * AIT-381 + AIT-392: CreateStudio workbench post-generate result fold.
 *
 * After a Lab try or owned generate finishes on the workbench path
 * (`!fixedMomentContract`, esp. 360-spin-showcase), mobile sticky + stage
 * surface exactly one primary next action above the fold.
 *
 * Allowed primaries: replay | library (save/open) | generate-again.
 * Fixed Moment contract and freeLiveOpen gates stay outside this helper.
 *
 * AIT-392: Library primary may deep-link `?job=` only for owner private
 * durable results (UUID requestId). Lab demo never deep-links as private.
 *
 * Labels mirror lib/provenance.ts (Cached demo / Local Library) so strip-type
 * smokes can import this module without path-alias resolution.
 */

export type WorkbenchResultPrimaryKind =
  | "replay"
  | "library"
  | "generate-again";

export type WorkbenchResultProvenanceKind =
  | "lab"
  | "live-private"
  | "live-local";

export type WorkbenchResultPrimary = {
  kind: WorkbenchResultPrimaryKind;
  /** Sticky / stage primary button label. */
  label: string;
  /** One-line honest Lab vs Live provenance under the CTA. */
  stickyHint: string;
  provenanceKind: WorkbenchResultProvenanceKind;
};

/** Keep in lockstep with PROVENANCE.cachedDemo / localLibrary. */
const CACHED_DEMO = "Cached demo";
const LOCAL_LIBRARY = "Local Library";

/**
 * UUID shape for Library deep-link job / durable request ids.
 * Must stay aligned with LibraryGrid `LIBRARY_JOB_ID_RE` / parseDeepLinkJobId.
 */
const LIBRARY_DEEP_LINK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve the single mobile sticky / stage primary for workbench `status=done`.
 *
 * Priority:
 * 1. Live private result → owner-safe Library handoff
 * 2. Lab sample → Replay when playable (honest “not your photo”); else generate-again
 * 3. Live local (device history) → Open Library
 * 4. Fallback → generate-again
 */
export function resolveWorkbenchResultPrimary(input: {
  demo: boolean;
  privateResult: boolean;
  playable: boolean;
}): WorkbenchResultPrimary {
  // Owner-scoped private object — never claim a foreign/Lab clip is “yours”.
  if (!input.demo && input.privateResult) {
    return {
      kind: "library",
      label: "Open Library · private result",
      stickyHint: "Account Library · owner-only handoff",
      provenanceKind: "live-private",
    };
  }

  // Lab try / cached demo — not an owned private vault entry.
  if (input.demo) {
    if (input.playable) {
      return {
        kind: "replay",
        label: "Replay · Lab sample",
        stickyHint: `${CACHED_DEMO} · not your photo`,
        provenanceKind: "lab",
      };
    }
    return {
      kind: "generate-again",
      label: "Generate again · Lab free",
      stickyHint: `${CACHED_DEMO} · 0 credits · not your photo`,
      provenanceKind: "lab",
    };
  }

  // Live generation without private object — device Library only (honest).
  return {
    kind: "library",
    label: "Open Library",
    stickyHint: `${LOCAL_LIBRARY} · this browser only`,
    provenanceKind: "live-local",
  };
}

/**
 * AIT-392: owner-safe Library href for workbench fold primary.
 *
 * Fail-closed:
 * - Lab demo → plain `/library` (never claim a private owned clip)
 * - live-local / missing privateResult → plain `/library`
 * - private without valid UUID requestId → plain `/library` (list, no fake open)
 * - private + UUID requestId → `/library?job=<id>` for exact owner open/highlight
 */
export function libraryWorkbenchHandoffHref(input: {
  demo: boolean;
  privateResult: boolean;
  requestId?: string | null;
}): string {
  if (input.demo) return "/library";
  if (!input.privateResult) return "/library";
  const id =
    typeof input.requestId === "string" ? input.requestId.trim() : "";
  if (!id || !LIBRARY_DEEP_LINK_ID_RE.test(id)) return "/library";
  return `/library?job=${encodeURIComponent(id)}`;
}

/**
 * True when a Library list row matches a deep-link id (durable job id or requestId).
 * Owner list is already fail-closed; this only selects among visible owner rows.
 */
export function libraryJobMatchesDeepLink(
  job: { id?: string; requestId?: string },
  deepLinkId: string
): boolean {
  if (!deepLinkId) return false;
  if (job.id === deepLinkId) return true;
  if (typeof job.requestId === "string" && job.requestId === deepLinkId) {
    return true;
  }
  return false;
}
