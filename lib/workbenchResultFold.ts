/**
 * AIT-469 / AIT-381: CreateStudio workbench post-generate result fold.
 *
 * After a Lab try or owned generate finishes on the workbench path
 * (`!fixedMomentContract`, esp. 360-spin-showcase), mobile sticky + stage
 * surface exactly one primary next action above the fold.
 *
 * Allowed primaries: replay | library (save/open) | generate-again.
 * Fixed Moment contract and freeLiveOpen gates stay outside this helper.
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
