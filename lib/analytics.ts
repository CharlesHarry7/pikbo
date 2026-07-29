/**
 * Optional, privacy-minimized product analytics.
 *
 * External analytics is deliberately limited to the six funnel facts below.
 * Callers may keep using older internal event names while UI code is retired,
 * but those names are either mapped to one of the six facts or dropped.
 *
 * No original path, recipe, prompt, email, image, provider/object identifier,
 * URL, or arbitrary metadata value is ever copied to an external payload.
 */

export const PRIVACY_FUNNEL_EVENTS = [
  "create_view",
  "asset_upload_complete",
  "generation_start",
  "generation_success",
  "download",
  "regenerate_7d",
] as const;

export type PrivacyFunnelEvent = (typeof PRIVACY_FUNNEL_EVENTS)[number];

type LegacyAnalyticsEvent =
  | "landing_view"
  | "project_open"
  | "recipe_use"
  | "upload_ready"
  | "recipe_selected"
  | "generation_quote_view"
  | "pack_quote_view"
  | "pack_start"
  | "generate_start"
  | "generate_result"
  | "export_click";

export type AnalyticsEvent = PrivacyFunnelEvent | LegacyAnalyticsEvent;

export type AnalyticsPayload = {
  event: AnalyticsEvent;
  path?: string;
  recipe?: string;
  demo?: boolean;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

type SafeSurface = "create" | "library" | "tool";
type SafeMode = "demo" | "live";

export type PrivacyAnalyticsEnvelope = {
  event: PrivacyFunnelEvent;
  surface?: SafeSurface;
  mode?: SafeMode;
  output_count?: number;
  ts: number;
};

const DOWNLOAD_VIA_ALLOWLIST = new Set([
  "downloads_api_blob",
  "direct_after_gate",
  "direct",
]);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000;
const RETENTION_FIRST_SUCCESS_KEY =
  "pikbo.analytics.first-live-success-at.v1";
const RETENTION_RECORDED_KEY = "pikbo.analytics.regenerate-7d.v1";

function endpoint(): string | null {
  const url = process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim();
  return url || null;
}

function gaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
  // G-XXXXXXXX or similar public measurement id only.
  if (!id || id.length < 6 || id.length > 32) return null;
  if (!/^[A-Z0-9-]+$/i.test(id)) return null;
  return id;
}

function safeSurface(path?: string): SafeSurface | undefined {
  if (typeof path !== "string") return undefined;
  const clean = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (clean === "/create") return "create";
  if (clean === "/library") return "library";
  if (/^\/effects\/[^/]+$/.test(clean)) return "tool";
  return undefined;
}

function safeOutputCount(
  meta?: AnalyticsPayload["meta"]
): number | undefined {
  const value = meta?.outputs;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 3
  ) {
    return undefined;
  }
  return value;
}

function isFailedGenerationResult(meta?: AnalyticsPayload["meta"]): boolean {
  if (!meta) return false;
  if (meta.processedUpload === false || meta.uploadIgnored === true) return true;
  if (meta.ok === false || meta.success === false) return true;
  const status = typeof meta.status === "string" ? meta.status.toLowerCase() : "";
  return status === "error" || status === "failed" || status === "cancelled";
}

function safeEnvelope(
  event: PrivacyFunnelEvent,
  payload: AnalyticsPayload,
  now: number
): PrivacyAnalyticsEnvelope {
  const surface = safeSurface(payload.path);
  const mode: SafeMode | undefined =
    payload.demo === true
      ? "demo"
      : payload.demo === false
        ? "live"
        : undefined;
  const outputCount =
    event === "generation_start" ? safeOutputCount(payload.meta) : undefined;

  return {
    event,
    ...(surface ? { surface } : {}),
    ...(mode ? { mode } : {}),
    ...(outputCount ? { output_count: outputCount } : {}),
    ts: now,
  };
}

function toPrivacyEnvelope(
  payload: AnalyticsPayload,
  now = Date.now()
): PrivacyAnalyticsEnvelope | null {
  switch (payload.event) {
    case "create_view":
      return safeSurface(payload.path) === "create"
        ? safeEnvelope("create_view", payload, now)
        : null;
    case "asset_upload_complete":
      return safeEnvelope("asset_upload_complete", payload, now);
    case "generation_start":
    case "pack_start":
    case "generate_start":
      return safeEnvelope("generation_start", payload, now);
    case "generation_success":
      return isFailedGenerationResult(payload.meta)
        ? null
        : safeEnvelope("generation_success", payload, now);
    case "generate_result":
      return isFailedGenerationResult(payload.meta)
        ? null
        : safeEnvelope("generation_success", payload, now);
    case "download":
      return safeEnvelope("download", payload, now);
    case "export_click": {
      const via = payload.meta?.via;
      return typeof via === "string" && DOWNLOAD_VIA_ALLOWLIST.has(via)
        ? safeEnvelope("download", payload, now)
        : null;
    }
    // regenerate_7d is derived from two real, live successes below. Callers
    // cannot declare retention directly.
    case "regenerate_7d":
    // upload_ready may mean only a local handoff and duplicates the explicit
    // asset_upload_complete event in Create. The remaining legacy UI events
    // are intentionally outside the six-event product funnel.
    case "upload_ready":
    case "landing_view":
    case "project_open":
    case "recipe_use":
    case "recipe_selected":
    case "generation_quote_view":
    case "pack_quote_view":
      return null;
  }
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

  const scriptId = "pikbo-ga4";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
    w.gtag("js", new Date());
    w.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: false,
    });
  }
  return w.gtag;
}

function safePageLocation(surface?: SafeSurface): string | undefined {
  if (typeof window === "undefined" || !surface) return undefined;
  const pathname =
    surface === "create"
      ? "/create"
      : surface === "library"
        ? "/library"
        : "/effects";
  return `${window.location.origin}${pathname}`;
}

function trackGa4(envelope: PrivacyAnalyticsEnvelope): void {
  const id = gaMeasurementId();
  if (!id || typeof window === "undefined") return;
  try {
    const gtag = ensureGtag(id);
    if (!gtag) return;
    gtag("event", envelope.event, {
      surface: envelope.surface,
      mode: envelope.mode,
      output_count: envelope.output_count,
      page_location: safePageLocation(envelope.surface),
      page_referrer: "",
    });
  } catch {
    // Analytics must never break the product path.
  }
}

function trackBeacon(envelope: PrivacyAnalyticsEnvelope): void {
  try {
    const url = endpoint();
    if (!url || typeof window === "undefined") return;
    const body = JSON.stringify(envelope);
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
    // Analytics must never break the product path.
  }
}

function dispatch(envelope: PrivacyAnalyticsEnvelope): void {
  trackBeacon(envelope);
  trackGa4(envelope);
}

type RetentionDecision = "initialize" | "emit" | "none" | "reset";

function retentionDecision(
  firstSuccessAt: number | null,
  alreadyRecorded: boolean,
  now: number
): RetentionDecision {
  if (
    firstSuccessAt === null ||
    !Number.isFinite(firstSuccessAt) ||
    firstSuccessAt <= 0
  ) {
    return "initialize";
  }
  if (firstSuccessAt > now) return "reset";
  if (alreadyRecorded) return "none";
  return now - firstSuccessAt >= SEVEN_DAYS_MS ? "emit" : "none";
}

function maybeTrackSevenDayReturn(
  success: PrivacyAnalyticsEnvelope
): void {
  if (
    success.event !== "generation_success" ||
    success.mode !== "live" ||
    typeof window === "undefined"
  ) {
    return;
  }
  try {
    const storage = window.localStorage;
    const rawFirst = storage.getItem(RETENTION_FIRST_SUCCESS_KEY);
    const parsedFirst = rawFirst === null ? null : Number(rawFirst);
    const alreadyRecorded = storage.getItem(RETENTION_RECORDED_KEY) === "1";
    const decision = retentionDecision(
      parsedFirst,
      alreadyRecorded,
      success.ts
    );

    if (decision === "initialize" || decision === "reset") {
      storage.setItem(RETENTION_FIRST_SUCCESS_KEY, String(success.ts));
      if (decision === "reset") {
        storage.removeItem(RETENTION_RECORDED_KEY);
      }
      return;
    }
    if (decision !== "emit") return;

    storage.setItem(RETENTION_RECORDED_KEY, "1");
    dispatch({
      event: "regenerate_7d",
      ...(success.surface ? { surface: success.surface } : {}),
      mode: "live",
      ts: success.ts,
    });
  } catch {
    // localStorage may be disabled; primary success tracking still stands.
  }
}

/** Client-safe fire-and-forget. Swallows all errors. */
export function track(payload: AnalyticsPayload): void {
  try {
    const envelope = toPrivacyEnvelope(payload);
    if (!envelope) return;
    dispatch(envelope);
    maybeTrackSevenDayReturn(envelope);
  } catch {
    // Never throw into the product UI.
  }
}

/**
 * Route-level tracking is intentionally narrower than a general page-view
 * adapter. Only a visit to /create is part of the approved external funnel.
 */
export function trackPageView(pathname: string): void {
  try {
    if (typeof window === "undefined") return;
    const envelope = toPrivacyEnvelope({
      event: "create_view",
      path: pathname,
    });
    if (envelope) dispatch(envelope);
  } catch {
    // Never throw into the product UI.
  }
}

export function analyticsConfigured(): boolean {
  return Boolean(endpoint() || gaMeasurementId());
}

/** Presence only — never log ids in product UI. */
export function ga4Configured(): boolean {
  return Boolean(gaMeasurementId());
}

/** Pure helpers exposed only for the dependency-free regression fixture. */
export const __privacyAnalyticsTest = {
  toPrivacyEnvelope,
  retentionDecision,
  sevenDaysMs: SEVEN_DAYS_MS,
};
