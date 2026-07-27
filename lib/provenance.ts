/**
 * Soft-launch PRD §6 — required UI state language.
 * Use these exact labels so Create / Landing / Library / Batch stay honest.
 */

export const PROVENANCE = {
  cachedDemo: "Cached demo",
  liveGeneration: "Live generation",
  onPlayerMark: "On-player mark",
  localLibrary: "Local Library",
  labPrototype: "PIKBO Lab cached prototype",
} as const;

export type ProvenanceLabel =
  (typeof PROVENANCE)[keyof typeof PROVENANCE];

/** Result of a /api/generate success payload. */
export function resultProvenanceLabel(demo: boolean): string {
  return demo ? PROVENANCE.cachedDemo : PROVENANCE.liveGeneration;
}

/** Short note under live results — never claim cloud backup. */
export function localLibraryNote(): string {
  return `${PROVENANCE.localLibrary} · saved in this browser only (not cloud-synced)`;
}
