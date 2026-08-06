/** Client-side generation history (Local Library). No server DB / cloud sync. */

import {
  canDownloadResult,
  freeLiveDownloadBlockReason,
  isSafeDeliverableUrl,
  durableClientVideoUrl,
  classifyDownloadHead,
} from "@/lib/createTrust";
import { resultProvenanceLabel } from "@/lib/provenance";

export type HistoryItem = {
  id: string;
  videoUrl: string;
  /** Device-local SKU/project grouping. Not a cloud project id. */
  projectId?: string;
  projectName?: string;
  /** Small local preview only; large uploads are intentionally not duplicated. */
  inputImage?: string;
  effect: string;
  effectName: string;
  model?: string;
  watermark?: boolean;
  demo?: boolean;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  requestId?: string;
  /** PIKBO Lab prototype project id when generated via remix handoff */
  sourceProject?: string;
  /** Remix channel hint (etsy / reels / …) */
  channel?: string;
  /** Optional Toy Identity SKU label from Create (device-local only). */
  sku?: string;
  status?: "succeeded";
  creditStatus?: "0 cached" | "10 used";
  createdAt: string;
};

/**
 * Free live raw provider URLs must not be treated as Library deliverables (T6).
 * Cached demos and paid (no watermark) remain downloadable.
 */
export function historyItemDownloadAllowed(
  item: Pick<HistoryItem, "demo" | "watermark">
): boolean {
  return canDownloadResult({
    demo: Boolean(item.demo),
    watermark: Boolean(item.watermark),
  });
}

export function historyDownloadBlockReason(): string {
  return freeLiveDownloadBlockReason();
}

/** Support / export helper — cached vs live without guessing from URL. */
export function historyProvenance(item: Pick<HistoryItem, "demo">): string {
  return resultProvenanceLabel(Boolean(item.demo));
}

const KEY = "pikbo_library_v1";
const MAX = 48;
/** Same-tab signal used when a detached Create request finishes in background. */
export const LIBRARY_HISTORY_CHANGED_EVENT = "pikbo:library-history-changed";
/** Cap device Library still previews — never store multi-MB Base64 uploads. */
const MAX_INPUT_IMAGE_CHARS = 8_000;

function slimInputImage(inputImage: string | undefined): string | undefined {
  if (!inputImage) return undefined;
  // Path samples (/demos/…) are fine; large data: URLs bloat localStorage.
  if (inputImage.startsWith("/")) return inputImage;
  if (
    inputImage.startsWith("data:image/") &&
    inputImage.length <= MAX_INPUT_IMAGE_CHARS
  ) {
    return inputImage;
  }
  return undefined;
}

/**
 * Normalize one history row for durable store hydrate.
 * Storage signed absolute URLs rewrite to `/api/downloads/{id}` when requestId
 * is known; otherwise they are dropped so tokens never re-enter localStorage.
 */
function normalizeItem(raw: unknown): HistoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.videoUrl !== "string" || !o.videoUrl) return null;
  // Import / restore must never rehydrate javascript: or other unsafe schemes.
  if (!isSafeDeliverableUrl(o.videoUrl)) return null;
  if (typeof o.effect !== "string" || typeof o.effectName !== "string") {
    return null;
  }
  const requestId =
    typeof o.requestId === "string" && o.requestId.trim()
      ? o.requestId.trim()
      : undefined;
  const videoUrl = durableClientVideoUrl(o.videoUrl.trim(), { requestId });
  if (!videoUrl) return null;
  return {
    id:
      typeof o.id === "string" && o.id
        ? o.id
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    videoUrl,
    projectId: typeof o.projectId === "string" ? o.projectId : undefined,
    projectName:
      typeof o.projectName === "string" ? o.projectName : undefined,
    sku: typeof o.sku === "string" && o.sku.trim() ? o.sku.trim().slice(0, 48) : undefined,
    inputImage: slimInputImage(
      typeof o.inputImage === "string" ? o.inputImage : undefined
    ),
    effect: o.effect,
    effectName: o.effectName,
    model: typeof o.model === "string" ? o.model : undefined,
    watermark: Boolean(o.watermark),
    demo: Boolean(o.demo),
    duration: typeof o.duration === "number" ? o.duration : undefined,
    aspectRatio: typeof o.aspectRatio === "string" ? o.aspectRatio : undefined,
    resolution: typeof o.resolution === "string" ? o.resolution : undefined,
    requestId,
    sourceProject:
      typeof o.sourceProject === "string" ? o.sourceProject : undefined,
    channel: typeof o.channel === "string" ? o.channel : undefined,
    status: "succeeded",
    creditStatus:
      o.creditStatus === "0 cached" || o.creditStatus === "10 used"
        ? o.creditStatus
        : Boolean(o.demo)
          ? "0 cached"
          : "10 used",
    createdAt:
      typeof o.createdAt === "string" && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
  };
}

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown[];
    if (!Array.isArray(list)) return [];
    return list.map(normalizeItem).filter((x): x is HistoryItem => Boolean(x));
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryItem[]): void {
  const capped = list.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(capped));
    return;
  } catch {
    // QuotaExceeded — strip heavy still previews and retry (keep clip metadata).
  }
  try {
    const slim = capped.map((item) => {
      if (!item.inputImage || item.inputImage.length < 8_000) return item;
      const { inputImage: _drop, ...rest } = item;
      void _drop;
      return rest;
    });
    localStorage.setItem(KEY, JSON.stringify(slim));
    return;
  } catch {
    /* still over quota */
  }
  try {
    // Last resort: newest half, no input images.
    const half = capped.slice(0, Math.max(8, Math.floor(MAX / 2))).map((item) => {
      const { inputImage: _drop, ...rest } = item;
      void _drop;
      return rest;
    });
    localStorage.setItem(KEY, JSON.stringify(half));
  } catch {
    // give up — previous library remains until next successful write
  }
}

export function pushHistory(
  item: Omit<HistoryItem, "id" | "createdAt">
): HistoryItem[] {
  // Signed storage URLs rewrite to controlled gate or drop — never persist tokens.
  const videoUrl = durableClientVideoUrl(item.videoUrl, {
    requestId: item.requestId,
  });
  if (!videoUrl) {
    return loadHistory();
  }
  const next: HistoryItem = {
    ...item,
    videoUrl,
    inputImage: slimInputImage(item.inputImage),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const list = [next, ...loadHistory()].slice(0, MAX);
  saveHistory(list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIBRARY_HISTORY_CHANGED_EVENT));
  }
  return list;
}

export function removeHistoryItem(id: string): HistoryItem[] {
  const list = loadHistory().filter((i) => i.id !== id);
  saveHistory(list);
  return list;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Bearer headers for owner-gated private result metadata/download routes. */
export async function privateDownloadHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  try {
    const { getSupabaseBrowser } = await import("@/lib/supabase/browser");
    const supabase = getSupabaseBrowser();
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Merge exported library JSON into local history (dedupe by id / videoUrl).
 * Returns new list length, or -1 on parse failure.
 */
export function importHistoryJson(text: string): number {
  try {
    const parsed = JSON.parse(text) as unknown;
    const arr = Array.isArray(parsed) ? parsed : null;
    if (!arr) return -1;
    const incoming = arr
      .map(normalizeItem)
      .filter((x): x is HistoryItem => Boolean(x));
    if (incoming.length === 0) return -1;

    const existing = loadHistory();
    const seen = new Set(existing.map((i) => i.id));
    const urls = new Set(existing.map((i) => i.videoUrl));
    const merged = [...existing];
    for (const item of incoming) {
      if (seen.has(item.id) || urls.has(item.videoUrl)) continue;
      seen.add(item.id);
      urls.add(item.videoUrl);
      merged.push(item);
    }
    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    saveHistory(merged.slice(0, MAX));
    return Math.min(merged.length, MAX);
  } catch {
    return -1;
  }
}

/**
 * fal / provider CDN URLs are temporary. After ~5 days, re-download often fails.
 * Local /demos paths and data: never "expire" for this check.
 */
export function remoteClipMayExpire(item: {
  videoUrl: string;
  createdAt: string;
  demo?: boolean;
}): boolean {
  if (item.demo) return false;
  const url = item.videoUrl || "";
  if (!/^https?:\/\//i.test(url)) return false;
  const created = Date.parse(item.createdAt);
  if (!Number.isFinite(created)) return false;
  const ageMs = Date.now() - created;
  return ageMs > 5 * 24 * 60 * 60 * 1000;
}

/** Download a remote or local video (fal CORS allows *). Falls back to new tab. */
export async function downloadVideoFile(
  url: string,
  filename: string
): Promise<"ok" | "fallback" | "fail" | "unsafe" | "blocked"> {
  if (!isSafeDeliverableUrl(url)) return "unsafe";
  const isGate =
    url.startsWith("/api/downloads/") || url.includes("/api/downloads/");
  // Controlled gate: HEAD first so cancel/timeout never blob-fetch 409 JSON.
  // Track HEAD allow so CORS/network on the redirect target can still open the
  // gate tab (browser follows 302 to video) without dumping error JSON.
  let gateHeadAllowed = false;
  const authHeaders = isGate ? await privateDownloadHeaders() : {};
  if (isGate) {
    try {
      const head = await fetch(url, {
        method: "HEAD",
        headers: authHeaders,
      });
      const gate = classifyDownloadHead({
        status: head.status,
        code: head.headers.get("X-Pikbo-Download-Code") || "",
        t6Mode: head.headers.get("X-Pikbo-T6"),
      });
      if (gate.kind === "block" || gate.kind === "not_found") {
        return "blocked";
      }
      if (gate.kind === "allow") {
        gateHeadAllowed = true;
      } else if (!head.ok) {
        return "blocked";
      }
    } catch {
      /* network — continue to GET attempt */
    }
  }
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 45_000);
  try {
    // Relative /demos/... works same-origin; absolute fal needs CORS.
    const res = await fetch(url, {
      mode: "cors",
      signal: ctrl.signal,
      headers: authHeaders,
    });
    // Hard HTTP fail on gate = JSON error body — never open as a tab.
    if (!res.ok) {
      if (isGate) return "blocked";
      throw new Error(String(res.status));
    }
    // Gate / error bodies are application/json — never save JSON as "video".
    const ct = (res.headers.get("Content-Type") || "").toLowerCase();
    if (
      ct.includes("application/json") ||
      ct.includes("text/html") ||
      ct.includes("text/plain")
    ) {
      return "blocked";
    }
    const blob = await res.blob();
    if (!blob || blob.size < 32) throw new Error("empty");
    // Second line of defense if Content-Type was missing/mis-set.
    if (
      isGate &&
      blob.type &&
      (blob.type.includes("json") || blob.type.startsWith("text/"))
    ) {
      return "blocked";
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return "ok";
  } catch {
    try {
      // Re-check: never open unsafe schemes even on fetch failure path.
      if (!isSafeDeliverableUrl(url)) return "unsafe";
      if (isGate) {
        // CORS/network after HEAD allow: browser tab can follow 302 to the file.
        // HEAD block / JSON body already returned "blocked" above.
        if (gateHeadAllowed) {
          window.open(url, "_blank", "noopener,noreferrer");
          return "fallback";
        }
        return "blocked";
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return "fallback";
    } catch {
      return "fail";
    }
  } finally {
    window.clearTimeout(timer);
  }
}

/** Backup library as JSON file for the user / support. */
export function exportHistoryJson(): void {
  const list = loadHistory().map((item) => {
    const downloadAllowed = historyItemDownloadAllowed(item);
    return {
      ...item,
      /** Soft-launch PRD ops: identify cached demo vs live without guessing. */
      provenance: historyProvenance(item),
      /** T6 honesty — Free live raw is not a deliverable. */
      downloadAllowed,
      downloadGate: downloadAllowed ? ("allowed" as const) : ("blocked" as const),
      storage: "local-browser" as const,
    };
  });
  const blob = new Blob([JSON.stringify(list, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `pikbo-library-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
