/**
 * Guest → login → Create intent handoff (AIT-49 / AIT-90 / AIT-107 / AIT-122).
 *
 * Query `next=` is the primary carrier. sessionStorage is a same-browser backup
 * when the magic-link / OAuth callback drops or strips `next`. Soft-launch keeps
 * Moment as the default create door; 360/remix deep links stay as create query
 * shapes so source/effect survive auth.
 *
 * Chrome Generate doors (Header, MobileGenerateBar, Home secondary 360) honestly
 * deep-link `/create?...` only — they do not open bare `/login`. Guest sign-in
 * is forced on Create (`GuestMomentCreateGate` / CreateStudio) via
 * `loginHrefForGuestCreate`, so frozen `source` / `effect` tags must survive
 * that handoff. Never invent a second intent store.
 *
 * Pure module (no path-alias imports) so node --experimental-strip-types
 * regressions can import it without a bundler.
 */

/** Keep in lockstep with `MOMENT_CREATE_HREF` in softLaunch.ts. */
export const GUEST_MOMENT_CREATE_HREF =
  "/create?mode=moment&effect=street-power-up" as const;

/**
 * Frozen chrome / home-secondary Generate `source` tags (AIT-122).
 * Keep in lockstep with createGenerate360Href("…") call sites.
 * Rename only with chrome-generate-guest-intent-regression + generate-360-cta-smoke.
 */
export const CHROME_GENERATE_SOURCE_TAGS = [
  "header",
  "mobile-bar",
  "home-proof-wall",
  "home-tool-shelf",
  "home-browse",
  "hf-product-rail",
] as const;

export type ChromeGenerateSourceTag =
  (typeof CHROME_GENERATE_SOURCE_TAGS)[number];

/** sessionStorage key — device-local only, never sent to the server. */
export const GUEST_CREATE_INTENT_STORAGE_KEY = "pikbo_guest_create_intent_v1";

/** Short TTL so a stale intent cannot hijack a later sign-in. */
export const GUEST_CREATE_INTENT_TTL_MS = 2 * 60 * 60 * 1000;

/** Same-origin path only; mirrors authRedirect.sanitizeInternalNextPath. */
function sanitizeInternalNextPath(
  value: string | null | undefined,
  fallback = "/profile"
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const base = new URL("https://pikbo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin || !parsed.pathname.startsWith("/")) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/** Create deep-link query keys we will re-emit after login. */
const ALLOWED_CREATE_QUERY_KEYS = [
  "mode",
  "effect",
  "source",
  "ratio",
  "duration",
  "channel",
  "entry",
  "sample",
  "try",
  "sku",
  "moment",
  "job",
  "retryJobId",
  "retryToken",
] as const;

export type GuestCreateIntentFields = {
  mode?: string;
  effect?: string;
  source?: string;
  ratio?: string;
  duration?: string;
  channel?: string;
  entry?: string;
  sample?: string;
  try?: string;
  sku?: string;
  moment?: string;
  job?: string;
  retryJobId?: string;
  retryToken?: string;
};

type StashRecord = {
  path: string;
  savedAt: number;
};

function asSearchParams(
  input?: string | URLSearchParams | GuestCreateIntentFields | null
): URLSearchParams {
  if (!input) return new URLSearchParams();
  if (typeof input === "string") {
    const raw = input.startsWith("?")
      ? input.slice(1)
      : input.includes("://") || input.startsWith("/")
        ? (() => {
            try {
              return new URL(input, "https://pikbo.invalid").searchParams.toString();
            } catch {
              return input.replace(/^\?/, "");
            }
          })()
        : input;
    return new URLSearchParams(raw);
  }
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const q = new URLSearchParams();
  for (const key of ALLOWED_CREATE_QUERY_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      q.set(key, value.trim());
    }
  }
  return q;
}

function cleanParam(value: string | null | undefined, max = 96): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Build a safe `/create?...` next path from known create query keys.
 * Defaults to the fixed Moment door when the input is empty or Moment-shaped.
 */
export function buildGuestCreateNextPath(
  input?: string | URLSearchParams | GuestCreateIntentFields | null,
  opts?: { fallbackSource?: string }
): string {
  const params = asSearchParams(input);
  const effect = cleanParam(params.get("effect"), 64);
  const mode = cleanParam(params.get("mode"), 32);
  const source =
    cleanParam(params.get("source"), 64) ||
    cleanParam(opts?.fallbackSource, 64) ||
    "guest-create";

  // Soft-launch primary: fixed Street Power-Up Moment.
  const isMoment =
    mode === "moment" ||
    effect === "street-power-up" ||
    (!effect && !params.get("moment"));

  if (isMoment && !params.get("moment")) {
    return `${GUEST_MOMENT_CREATE_HREF}&source=${encodeURIComponent(source)}`;
  }

  const out = new URLSearchParams();
  for (const key of ALLOWED_CREATE_QUERY_KEYS) {
    const value = cleanParam(params.get(key), key === "retryToken" ? 128 : 96);
    if (value) out.set(key, value);
  }
  if (!out.has("source")) out.set("source", source);

  // Fail closed to Moment if nothing safe remains.
  if ([...out.keys()].every((k) => k === "source")) {
    return `${GUEST_MOMENT_CREATE_HREF}&source=${encodeURIComponent(source)}`;
  }

  const path = `/create?${out.toString()}`;
  return sanitizeInternalNextPath(path, GUEST_MOMENT_CREATE_HREF);
}

/** `/login?next=` for a create intent. Always same-origin path only. */
export function loginHrefForGuestCreate(
  input?: string | URLSearchParams | GuestCreateIntentFields | null,
  opts?: { fallbackSource?: string }
): string {
  const next = buildGuestCreateNextPath(input, opts);
  return `/login?next=${encodeURIComponent(next)}`;
}

export function isCreateIntentPath(path: string | null | undefined): boolean {
  if (!path || !path.startsWith("/create")) return false;
  const safe = sanitizeInternalNextPath(path, "");
  return safe.startsWith("/create");
}

/** Persist create intent for same-browser auth backup. */
export function stashGuestCreateIntent(
  path: string,
  storage: Pick<Storage, "setItem"> | null = defaultSessionStorage()
): string {
  const safe = sanitizeInternalNextPath(path, "");
  const next = isCreateIntentPath(safe)
    ? safe
    : buildGuestCreateNextPath(null, { fallbackSource: "guest-create" });
  if (!storage) return next;
  try {
    const record: StashRecord = { path: next, savedAt: Date.now() };
    storage.setItem(GUEST_CREATE_INTENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* private mode / quota — query next= remains primary */
  }
  return next;
}

/**
 * Read + clear a still-fresh stashed create path.
 * Invalid, expired, or non-create values are discarded silently.
 */
export function consumeGuestCreateIntent(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = defaultSessionStorage(),
  now = Date.now()
): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(GUEST_CREATE_INTENT_STORAGE_KEY);
    storage.removeItem(GUEST_CREATE_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StashRecord;
    if (!parsed || typeof parsed.path !== "string") return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (now - parsed.savedAt > GUEST_CREATE_INTENT_TTL_MS) return null;
    const safe = sanitizeInternalNextPath(parsed.path, "");
    return isCreateIntentPath(safe) ? safe : null;
  } catch {
    try {
      storage.removeItem(GUEST_CREATE_INTENT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Resolve where auth should land after sign-in.
 * Prefer explicit `next` when it is a create (or other non-default) path;
 * otherwise fall back to a fresh session stash; finally `/profile`.
 */
export function resolvePostAuthNext(
  nextParam: string | null | undefined,
  storage: Pick<Storage, "getItem" | "removeItem"> | null = defaultSessionStorage(),
  now = Date.now()
): string {
  const fromQuery = sanitizeInternalNextPath(nextParam ?? null);
  if (isCreateIntentPath(fromQuery)) {
    // Consume stash so a later login does not replay an old create intent.
    consumeGuestCreateIntent(storage, now);
    return fromQuery;
  }
  const stashed = consumeGuestCreateIntent(storage, now);
  if (stashed) return stashed;
  return fromQuery;
}

function defaultSessionStorage(): Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
