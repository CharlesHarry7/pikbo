const PRODUCTION_AUTH_ORIGIN = "https://pikbo.ai";
const PREVIEW_AUTH_ORIGIN =
  "https://pikbo-git-agent-gptp0-live-owned-toy-review-pi-kbo.vercel.app";

const DEPLOYED_AUTH_ORIGINS = new Set([
  PRODUCTION_AUTH_ORIGIN,
  PREVIEW_AUTH_ORIGIN,
]);

const LOCAL_AUTH_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function parsedOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isTrustedAuthOrigin(
  value: string | null,
  nodeEnv = process.env.NODE_ENV
): boolean {
  const origin = parsedOrigin(value);
  if (!origin) return false;
  if (DEPLOYED_AUTH_ORIGINS.has(origin)) return true;
  return nodeEnv !== "production" && LOCAL_AUTH_ORIGINS.has(origin);
}

/**
 * Resolve the page that initiated the same-origin POST.
 *
 * An explicit Origin/Referer that is not allowlisted fails closed. We never
 * fall back to NEXT_PUBLIC_SITE_URL, SITE_URL, VERCEL_URL, or an arbitrary
 * Host header, so one deployment cannot silently send another deployment's
 * callback.
 */
export function resolveTrustedAuthOrigin(
  req: Pick<Request, "headers" | "url">,
  nodeEnv = process.env.NODE_ENV
): string | null {
  const requestOrigin = req.headers.get("origin");
  if (requestOrigin) {
    const origin = parsedOrigin(requestOrigin);
    return isTrustedAuthOrigin(origin, nodeEnv) ? origin : null;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    const origin = parsedOrigin(referer);
    return isTrustedAuthOrigin(origin, nodeEnv) ? origin : null;
  }

  const origin = parsedOrigin(req.url);
  return isTrustedAuthOrigin(origin, nodeEnv) ? origin : null;
}

export function authCallbackUrl(
  origin: string,
  nodeEnv = process.env.NODE_ENV
): string {
  if (!isTrustedAuthOrigin(origin, nodeEnv)) {
    throw new Error("untrusted_auth_origin");
  }
  return `${new URL(origin).origin}/auth/callback`;
}

export const AUTH_CALLBACK_URLS = {
  production: `${PRODUCTION_AUTH_ORIGIN}/auth/callback`,
  preview: `${PREVIEW_AUTH_ORIGIN}/auth/callback`,
} as const;
