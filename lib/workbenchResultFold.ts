/**
 * AIT-529 / AIT-469 / AIT-392 / AIT-381: CreateStudio workbench post-generate
 * result fold.
 *
 * After a Lab try or owned generate finishes on the workbench path
 * (`!fixedMomentContract`, esp. 360-spin-showcase), mobile sticky + stage
 * surface exactly one primary next action above the fold.
 *
 * Allowed primaries: download | library | replay | generate-again (re-spin).
 * Fixed Moment contract and freeLiveOpen gates stay outside this helper.
 *
 * AIT-392 / AIT-529: Library primary may deep-link `?job=` only for owner
 * private durable results (UUID requestId). Lab demo never deep-links as
 * private owned. Listing 360 uses Re-spin labels on generate-again.
 *
 * Labels mirror lib/provenance.ts (Cached demo / Local Library) so strip-type
 * smokes can import this module without path-alias resolution.
 */

export type WorkbenchResultPrimaryKind =
  | "download"
  | "library"
  | "replay"
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
 * Priority (listing 360 residual — download / Library / re-spin):
 * 1. Live + download allowed + deliverable ready → Download (no dead tab)
 * 2. Live private result → owner-safe Library handoff
 * 3. Lab sample → Replay when playable (honest “not your photo”); else re-spin
 * 4. Live local (device history) → Open Library
 * 5. Fallback → re-spin / generate-again
 *
 * Lab never wins as Download primary even when demo files are openable —
 * provenance stays Cached demo · not your photo (Replay / Lab free re-spin).
 */
export function resolveWorkbenchResultPrimary(input: {
  demo: boolean;
  privateResult: boolean;
  playable: boolean;
  /** Live path only — Free raw / T6 block keeps this false. */
  downloadAllowed?: boolean;
  /** requestId or safe deliverable URL present (caller gates HEAD path). */
  downloadReady?: boolean;
  /** Canonical 360 listing spin effect → Re-spin labels. */
  listing360?: boolean;
}): WorkbenchResultPrimary {
  const respin = Boolean(input.listing360);
  const againLabLabel = respin
    ? "Re-spin · Lab free"
    : "Generate again · Lab free";

  // Seller listing path: owned Live file ready to take home (not Lab demo).
  if (
    !input.demo &&
    input.downloadAllowed &&
    input.downloadReady
  ) {
    return {
      kind: "download",
      label: respin ? "Download 360° spin" : "Download result",
      stickyHint: input.privateResult
        ? "Owner file · controlled download"
        : `${LOCAL_LIBRARY} · controlled download`,
      provenanceKind: input.privateResult ? "live-private" : "live-local",
    };
  }

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
      label: againLabLabel,
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
 * AIT-392 / AIT-529: owner-safe Library href for workbench fold primary.
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
 * Prevents deep-link resolve hang when Create handed off requestId ≠ list id.
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
