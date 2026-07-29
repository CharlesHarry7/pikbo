/**
 * Optional privacy-conscious product analytics (Phase H + GSC P0).
 * - NEXT_PUBLIC_ANALYTICS_URL → JSON beacon (legacy)
 * - NEXT_PUBLIC_GA_MEASUREMENT_ID → env-gated GA4 gtag
 * Missing config must never break rendering or build.
 * Never send photos, prompts, emails, asset URLs, or secrets.
 */

export type AnalyticsEvent =
  | "landing_view"
  | "project_open"
  | "recipe_open"
  | "recipe_use"
  | "upload_ready"
  | "asset_upload_complete"
  | "recipe_selected"
  | "generation_quote_view"
  | "pack_quote_view"
  | "pack_start"
  | "generate_start"
  | "generate_result"
  | "export_click";

export type AnalyticsPayload = {
  event: AnalyticsEvent;
  path?: string;
  recipe?: string;
  demo?: boolean;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

const SENSITIVE_META_KEYS =
  /url|image|photo|prompt|email|token|cookie|auth|key|secret|password|src|blob|base64/i;

function endpoint(): string | null {
  const url = process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim();
  return url || null;
}

function gaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
  // G-XXXXXXXX or similar public measurement id only
  if (!id || id.length < 6 || id.length > 32) return null;
  if (!/^[A-Z0-9-]+$/i.test(id)) return null;
  return id;
}

function sanitizeMeta(
  meta?: AnalyticsPayload["meta"]
): Record<string, string | number | boolean> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_META_KEYS.test(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      // Strip anything that looks like a URL or long opaque payload
      if (/^https?:\/\//i.test(v) || v.length > 80) continue;
      out[k] = v.slice(0, 80);
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

type GtagFn = (...args: unknown[]) => void;

function ensureGtag(measurementId: string): GtagFn | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    };
  }
  // Load gtag.js once
  const scriptId = "pikbo-ga4";
  if (!document.getElementById(scriptId)) {
    const s = document.createElement("script");
    s.id = scriptId;
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(s);
    w.gtag("js", new Date());
    w.gtag("config", measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });
  }
  return w.gtag;
}

function trackGa4(payload: AnalyticsPayload): void {
  const id = gaMeasurementId();
  if (!id) return;
  if (typeof window === "undefined") return;
  try {
    const gtag = ensureGtag(id);
    if (!gtag) return;
    const safe = sanitizeMeta(payload.meta);
    gtag("event", payload.event, {
      page_path: payload.path?.slice(0, 120) || undefined,
      recipe: payload.recipe?.slice(0, 64) || undefined,
      demo: payload.demo === true ? 1 : payload.demo === false ? 0 : undefined,
      ...(safe || {}),
    });
  } catch {
    // never throw
  }
}

function trackBeacon(payload: AnalyticsPayload): void {
  try {
    const url = endpoint();
    if (!url) return;
    if (typeof window === "undefined") return;
    const safeMeta = sanitizeMeta(payload.meta);
    const body = JSON.stringify({
      event: payload.event,
      path: payload.path?.slice(0, 120),
      recipe: payload.recipe?.slice(0, 64),
      demo: payload.demo,
      meta: safeMeta,
      ts: Date.now(),
      // path only — not full href (may include tokens)
      pathHref: window.location.pathname.slice(0, 120),
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      mode: "no-cors",
    }).catch(() => undefined);
  } catch {
    // never throw into product UI
  }
}

/** Client-safe fire-and-forget. Swallows all errors. No-op when unconfigured. */
export function track(payload: AnalyticsPayload): void {
  try {
    trackBeacon(payload);
    trackGa4(payload);
  } catch {
    // never throw
  }
}

/**
 * Route-level GA4 page_view (AppShell).
 * - pathname only (strip query / hash)
 * - send_page_view stays false on config to avoid double counts
 * - no photos, prompts, emails, tokens, or full URLs
 */
export function trackPageView(pathname: string): void {
  try {
    if (typeof window === "undefined") return;
    const path = (pathname || "/")
      .split("?")[0]
      .split("#")[0]
      .slice(0, 120);
    if (!path.startsWith("/")) return;

    const id = gaMeasurementId();
    if (id) {
      const gtag = ensureGtag(id);
      if (gtag) {
        gtag("event", "page_view", {
          page_path: path,
          page_title: undefined,
          page_location: undefined,
        });
      }
    }

    // Optional beacon — path only
    const url = endpoint();
    if (url) {
      const body = JSON.stringify({
        event: "page_view",
        path,
        ts: Date.now(),
      });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      }
    }
  } catch {
    // never throw
  }
}

export function analyticsConfigured(): boolean {
  return Boolean(endpoint() || gaMeasurementId());
}

/** Test helpers (presence only — never log ids in product UI). */
export function ga4Configured(): boolean {
  return Boolean(gaMeasurementId());
}
