/**
 * CORS for the separately deployed static marketing site (site/).
 *
 * Checkout return URLs still use trustedCheckoutOrigin (operator-controlled).
 * This module only opens browser CORS for allowed marketing/app origins.
 */

import { NextResponse } from "next/server";
import { site } from "@/lib/site";

const DEFAULT_ALLOW_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
].join(", ");

const DEFAULT_ALLOW_METHODS = "GET, POST, OPTIONS, HEAD";

/** Parse comma-separated absolute origins from env (no path, no trailing slash). */
export function parseAllowedOrigins(
  raw = process.env.PIKBO_MARKETING_ORIGINS || ""
): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((candidate) => {
      try {
        return new URL(candidate).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

/**
 * Origins allowed to call marketing + checkout APIs from a browser.
 * Always includes the canonical app origin. Extra hosts via
 * PIKBO_MARKETING_ORIGINS. Local static servers only outside production.
 */
export function marketingCorsAllowlist(): string[] {
  const set = new Set<string>();
  try {
    set.add(new URL(site.url).origin);
  } catch {
    set.add("https://pikbo.ai");
  }
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSite) {
    try {
      set.add(new URL(configuredSite).origin);
    } catch {
      // ignore invalid
    }
  }
  for (const origin of parseAllowedOrigins()) {
    set.add(origin);
  }
  if (process.env.NODE_ENV !== "production") {
    for (const origin of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ]) {
      set.add(origin);
    }
  }
  return [...set];
}

/** Returns the request Origin when it is on the allowlist; otherwise null. */
export function resolveMarketingCorsOrigin(
  request: Request
): string | null {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) return null;
  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    return null;
  }
  return marketingCorsAllowlist().includes(normalized) ? normalized : null;
}

/** Attach CORS headers when Origin is allowed. Safe no-op for same-origin. */
export function applyMarketingCors(
  request: Request,
  response: NextResponse
): NextResponse {
  const allowed = resolveMarketingCorsOrigin(request);
  if (!allowed) return response;

  response.headers.set("Access-Control-Allow-Origin", allowed);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOW_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

/** JSON helper that always applies marketing CORS when Origin is allowed. */
export function corsJson(
  request: Request,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return applyMarketingCors(request, NextResponse.json(body, init));
}

/** Preflight for browser CORS. Disallowed origins get 204 without ACAO. */
export function marketingCorsPreflight(request: Request): NextResponse {
  const allowed = resolveMarketingCorsOrigin(request);
  const response = new NextResponse(null, { status: 204 });
  if (!allowed) return response;
  response.headers.set("Access-Control-Allow-Origin", allowed);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOW_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}
