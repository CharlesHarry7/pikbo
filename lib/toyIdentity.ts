/**
 * Toy Identity — first-principles SKU lock (not OpenArt Character / Soul ID).
 *
 * Physics: one photo of a real toy the user owns.
 * Product truth: same toy across clips beats multi-model theater.
 * Five-step: optional SKU + preserve + Phase C-lite angle notes.
 * No LoRA, no cloud character train, no multi-image model input, no 3D.
 *
 * Server already appends TOY_IDENTITY_LOCK via buildGeneratePrompt.
 * This layer only adds optional SKU / preserve / fidelity notes into `extra`.
 */

import { MAX_EXTRA_CHARS, sanitizeExtra } from "@/lib/promptBuild";

export type ToyIdentity = {
  /** Short nickname / SKU label (e.g. "Scout #3 pink") */
  sku: string;
  /** What must not change (paint, logo, sculpt) */
  preserve: string;
};

/** Phase C-lite fidelity notes — prompt text only, not multi-image Soul ID. */
export type FidelityRefNotes = {
  /** User-claimed angles covered by stills (front/side/…) */
  angles: string[];
  /**
   * Secondary still is client preview only — generate still uses primary image.
   * Honesty: not sent as a second provider image.
   */
  hasSecondaryStill: boolean;
};

export const FIDELITY_ANGLE_CHIPS = [
  "front",
  "side",
  "back",
  "detail",
  "packaging",
] as const;

const STORAGE_KEY = "pikbo_toy_identity_v1";
const MAX_SKU = 48;
const MAX_PRESERVE = 120;

export const EMPTY_TOY_IDENTITY: ToyIdentity = { sku: "", preserve: "" };

export function sanitizeSku(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_SKU);
}

export function sanitizePreserve(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_PRESERVE);
}

export function sanitizeToyIdentity(raw: Partial<ToyIdentity> | null | undefined): ToyIdentity {
  return {
    sku: sanitizeSku(raw?.sku),
    preserve: sanitizePreserve(raw?.preserve),
  };
}

/** Compose optional identity (+ C-lite fidelity notes) into generate `extra`. */
export function composeExtraWithIdentity(
  identity: ToyIdentity,
  userExtra: unknown,
  refs?: FidelityRefNotes | null
): string {
  const base = sanitizeExtra(userExtra);
  const id = sanitizeToyIdentity(identity);
  const parts: string[] = [];
  if (id.sku) {
    parts.push(`Toy SKU/name: ${id.sku}.`);
  }
  if (id.preserve) {
    parts.push(`Preserve exactly: ${id.preserve}.`);
  }
  const angles = (refs?.angles ?? [])
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
  if (angles.length > 0) {
    parts.push(
      `Reference angles noted by seller: ${angles.join(", ")}. Keep silhouette, paint, and logos consistent.`
    );
  }
  if (refs?.hasSecondaryStill) {
    parts.push(
      "Seller attached a secondary detail still in studio (client preview only — not multi-image model input). Match paint lines, logos, and sculpt from the primary photo."
    );
  }
  if (parts.length === 0) return base;
  const identityBlock = parts.join(" ");
  if (!base) return identityBlock.slice(0, MAX_EXTRA_CHARS);
  return `${base} ${identityBlock}`.trim().slice(0, MAX_EXTRA_CHARS);
}

export function loadToyIdentity(): ToyIdentity {
  if (typeof window === "undefined") return { ...EMPTY_TOY_IDENTITY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_TOY_IDENTITY };
    return sanitizeToyIdentity(JSON.parse(raw) as Partial<ToyIdentity>);
  } catch {
    return { ...EMPTY_TOY_IDENTITY };
  }
}

/**
 * Prefer ?sku= query carry over device-local bible so AfterPath / Next SKU /
 * Library remake hops show the commercial label (and persist it).
 */
export function hydrateToyIdentityFromQuery(
  querySku?: string | null
): ToyIdentity {
  const base = loadToyIdentity();
  const q = sanitizeSku(querySku);
  if (!q) return base;
  return saveToyIdentity({ ...base, sku: q });
}

export function saveToyIdentity(identity: ToyIdentity): ToyIdentity {
  const next = sanitizeToyIdentity(identity);
  if (typeof window === "undefined") return next;
  try {
    if (!next.sku && !next.preserve) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* quota / private mode */
  }
  return next;
}

/** Library grouping label — empty when user skipped identity. */
export function identityProjectName(identity: ToyIdentity): string | undefined {
  const sku = sanitizeSku(identity.sku);
  return sku || undefined;
}
