/**
 * Toy Identity V0 — reusable, device-local SKU profiles.
 *
 * Physics: one photo of a real toy the user owns.
 * Product truth: same toy across clips beats multi-model theater.
 * - this is not LoRA training, a cloud character model, or a multi-reference claim;
 * - the live provider still receives the primary generation image plus prompt rules;
 * - the stable identity id groups repeat recipes for the same SKU on this device.
 *
 * Server already appends TOY_IDENTITY_LOCK via buildGeneratePrompt. This layer
 * gives that lock a reusable SKU, explicit Sales/Story intent, preservation
 * notes, and Phase C-lite angle notes. A later durable/multi-reference version
 * must keep this public contract.
 */

import { MAX_EXTRA_CHARS, sanitizeExtra } from "@/lib/promptBuild";

export type ToyIdentityMode = "sales" | "story";

export type ToyIdentity = {
  /** Stable device-local id. Empty until the first field is saved. */
  id: string;
  /** Short nickname / SKU label (e.g. "Scout #3 pink") */
  sku: string;
  /** What must not change (paint, logo, sculpt) */
  preserve: string;
  /** Sales favors fidelity; Story allows more expressive motion. */
  mode: ToyIdentityMode;
  createdAt: string;
  updatedAt: string;
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

export type ToyIdentityLibrary = {
  activeId: string | null;
  items: ToyIdentity[];
};

const LEGACY_STORAGE_KEY = "pikbo_toy_identity_v1";
const STORAGE_KEY = "pikbo_toy_identities_v2";
const MAX_SKU = 48;
const MAX_PRESERVE = 120;
const MAX_IDENTITIES = 12;

export const EMPTY_TOY_IDENTITY: ToyIdentity = {
  id: "",
  sku: "",
  preserve: "",
  mode: "sales",
  createdAt: "",
  updatedAt: "",
};

const EMPTY_LIBRARY: ToyIdentityLibrary = {
  activeId: null,
  items: [],
};

export function sanitizeSku(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_SKU);
}

export function sanitizePreserve(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_PRESERVE);
}

export function sanitizeToyIdentityMode(raw: unknown): ToyIdentityMode {
  return raw === "story" ? "story" : "sales";
}

function sanitizeIdentityId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function sanitizeTimestamp(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function sanitizeToyIdentity(raw: Partial<ToyIdentity> | null | undefined): ToyIdentity {
  return {
    id: sanitizeIdentityId(raw?.id),
    sku: sanitizeSku(raw?.sku),
    preserve: sanitizePreserve(raw?.preserve),
    mode: sanitizeToyIdentityMode(raw?.mode),
    createdAt: sanitizeTimestamp(raw?.createdAt),
    updatedAt: sanitizeTimestamp(raw?.updatedAt),
  };
}

export function hasToyIdentity(identity: ToyIdentity): boolean {
  return Boolean(sanitizeSku(identity.sku) || sanitizePreserve(identity.preserve));
}

function mintIdentityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `toy-${crypto.randomUUID()}`;
  }
  return `toy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLibrary(raw: unknown): ToyIdentityLibrary {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LIBRARY };
  const source = raw as { activeId?: unknown; items?: unknown };
  if (!Array.isArray(source.items)) return { ...EMPTY_LIBRARY };

  const seen = new Set<string>();
  const items = source.items
    .map((item) => sanitizeToyIdentity(item as Partial<ToyIdentity>))
    .filter((item) => {
      if (!item.id || !hasToyIdentity(item) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, MAX_IDENTITIES);
  const requestedActive = sanitizeIdentityId(source.activeId);
  const activeId = items.some((item) => item.id === requestedActive)
    ? requestedActive
    : items[0]?.id ?? null;

  return { activeId, items };
}

function writeLibrary(library: ToyIdentityLibrary): void {
  if (typeof window === "undefined") return;
  try {
    if (library.items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
}

function migrateLegacyIdentity(): ToyIdentityLibrary {
  if (typeof window === "undefined") return { ...EMPTY_LIBRARY };
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { ...EMPTY_LIBRARY };
    const legacy = sanitizeToyIdentity(
      JSON.parse(raw) as Partial<ToyIdentity>
    );
    if (!hasToyIdentity(legacy)) return { ...EMPTY_LIBRARY };
    const now = new Date().toISOString();
    const item: ToyIdentity = {
      ...legacy,
      id: mintIdentityId(),
      mode: "sales",
      createdAt: now,
      updatedAt: now,
    };
    const library = { activeId: item.id, items: [item] };
    writeLibrary(library);
    return library;
  } catch {
    return { ...EMPTY_LIBRARY };
  }
}

export function loadToyIdentityLibrary(): ToyIdentityLibrary {
  if (typeof window === "undefined") return { ...EMPTY_LIBRARY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyIdentity();
    return normalizeLibrary(JSON.parse(raw));
  } catch {
    return migrateLegacyIdentity();
  }
}

export function loadToyIdentities(): ToyIdentity[] {
  return loadToyIdentityLibrary().items;
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
  if (hasToyIdentity(id)) {
    parts.push(
      id.mode === "sales"
        ? "Sales mode: prioritize exact product geometry, paint, markings, and included accessories; do not invent product details."
        : "Story mode: allow expressive motion and scene changes while keeping the toy recognizable and on-model."
    );
  }
  const angles = (refs?.angles ?? [])
    .map((angle) => angle.trim().toLowerCase())
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
  // Identity is the product moat: keep it before user motion text so the cap
  // cannot silently truncate the fidelity contract.
  return `${identityBlock} ${base}`.trim().slice(0, MAX_EXTRA_CHARS);
}

export function loadToyIdentity(): ToyIdentity {
  if (typeof window === "undefined") return { ...EMPTY_TOY_IDENTITY };
  const library = loadToyIdentityLibrary();
  return (
    library.items.find((item) => item.id === library.activeId) ??
    library.items[0] ??
    { ...EMPTY_TOY_IDENTITY }
  );
}

export function saveToyIdentity(identity: ToyIdentity): ToyIdentity {
  const clean = sanitizeToyIdentity(identity);
  const library = loadToyIdentityLibrary();
  if (!hasToyIdentity(clean)) {
    if (clean.id) deleteToyIdentity(clean.id);
    return { ...EMPTY_TOY_IDENTITY };
  }
  const now = new Date().toISOString();
  const previous = library.items.find((item) => item.id === clean.id);
  const next: ToyIdentity = {
    ...clean,
    id: clean.id || mintIdentityId(),
    createdAt: previous?.createdAt || clean.createdAt || now,
    updatedAt: now,
  };
  if (typeof window === "undefined") return next;
  const items = [
    next,
    ...library.items.filter((item) => item.id !== next.id),
  ].slice(0, MAX_IDENTITIES);
  writeLibrary({ activeId: next.id, items });
  return next;
}

export function activateToyIdentity(id: string): ToyIdentity {
  const library = loadToyIdentityLibrary();
  const next = library.items.find((item) => item.id === sanitizeIdentityId(id));
  if (!next) return { ...EMPTY_TOY_IDENTITY };
  writeLibrary({ ...library, activeId: next.id });
  return next;
}

export function startNewToyIdentity(): ToyIdentity {
  const library = loadToyIdentityLibrary();
  writeLibrary({ ...library, activeId: null });
  return { ...EMPTY_TOY_IDENTITY };
}

export function deleteToyIdentity(id: string): ToyIdentity {
  const library = loadToyIdentityLibrary();
  const safeId = sanitizeIdentityId(id);
  const items = library.items.filter((item) => item.id !== safeId);
  const activeId =
    library.activeId === safeId
      ? items[0]?.id ?? null
      : library.activeId && items.some((item) => item.id === library.activeId)
        ? library.activeId
        : items[0]?.id ?? null;
  writeLibrary({ activeId, items });
  return (
    items.find((item) => item.id === activeId) ??
    items[0] ??
    { ...EMPTY_TOY_IDENTITY }
  );
}

/** Library grouping label — empty when user skipped identity. */
export function identityProjectName(identity: ToyIdentity): string | undefined {
  const sku = sanitizeSku(identity.sku);
  return sku || undefined;
}

/** Stable same-device project grouping across recipes for one saved SKU. */
export function identityProjectId(identity: ToyIdentity): string | undefined {
  const id = sanitizeIdentityId(identity.id);
  return id ? `identity-${id}` : undefined;
}
