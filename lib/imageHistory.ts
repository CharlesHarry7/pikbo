import { isSafeDeliverableUrl } from "@/lib/createTrust";

export type ImageHistoryItem = {
  id: string;
  imageUrl: string;
  prompt: string;
  demo?: boolean;
  /** Server-echoed when present (0 cached · flat live). */
  costCredits?: number;
  creditsOutcome?: "0 cached" | "10 used";
  /** Server/provider id when present (idempotent replay / support). */
  requestId?: string;
  createdAt: string;
};

const KEY = "pikbo_image_library_v1";
const MAX = 24;
/** Skip persisting huge data URLs (demo SVG can be large base64). */
const MAX_STORE_URL_CHARS = 120_000;

/** data:image/* demos + http(s)/path stills — reject javascript: and other schemes. */
export function isSafeImageHistoryUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:image/")) return true;
  return isSafeDeliverableUrl(url);
}

function slimItem(item: ImageHistoryItem): ImageHistoryItem {
  if (
    !item.imageUrl ||
    item.imageUrl.length <= MAX_STORE_URL_CHARS ||
    !item.imageUrl.startsWith("data:")
  ) {
    return item;
  }
  // Keep metadata; drop heavy still — user can re-generate demo free.
  return { ...item, imageUrl: "" };
}

function writeList(list: ImageHistoryItem[]): void {
  const capped = list.slice(0, MAX).map(slimItem).filter((i) => i.imageUrl || i.prompt);
  try {
    localStorage.setItem(KEY, JSON.stringify(capped));
    return;
  } catch {
    /* quota */
  }
  try {
    // Drop empty/data URLs and keep newest half.
    const half = capped
      .filter((i) => i.imageUrl && !i.imageUrl.startsWith("data:"))
      .slice(0, Math.max(4, Math.floor(MAX / 2)));
    localStorage.setItem(KEY, JSON.stringify(half.length ? half : capped.slice(0, 4)));
  } catch {
    /* give up */
  }
}

export function loadImageHistory(): ImageHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ImageHistoryItem[];
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (i) =>
          i &&
          typeof i.prompt === "string" &&
          typeof i.imageUrl === "string" &&
          i.imageUrl &&
          isSafeImageHistoryUrl(i.imageUrl)
      )
      .map((i) => ({
        ...i,
        demo: Boolean(i.demo),
        costCredits:
          typeof i.costCredits === "number" ? i.costCredits : undefined,
        creditsOutcome:
          i.creditsOutcome === "0 cached" || i.creditsOutcome === "10 used"
            ? i.creditsOutcome
            : undefined,
        requestId:
          typeof i.requestId === "string" && i.requestId
            ? i.requestId
            : undefined,
      }));
  } catch {
    return [];
  }
}

export function pushImageHistory(
  item: Omit<ImageHistoryItem, "id" | "createdAt">
): ImageHistoryItem[] {
  if (!isSafeImageHistoryUrl(item.imageUrl)) {
    // Refuse to persist unsafe schemes — return current store unchanged.
    return loadImageHistory();
  }
  const next: ImageHistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const list = [next, ...loadImageHistory()].slice(0, MAX);
  writeList(list);
  return loadImageHistory();
}

export function removeImageHistoryItem(id: string): ImageHistoryItem[] {
  const list = loadImageHistory().filter((i) => i.id !== id);
  writeList(list);
  return list;
}

export function clearImageHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
