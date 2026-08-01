export const AUTH_RETURN_PATH_STORAGE_KEY = "pikbo_auth_return_path:v1";
export const DEFAULT_AUTH_RETURN_PATH = "/profile";

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/;
const SCHEME_AFTER_ROOT = /^\/[a-z][a-z\d+.-]*:/i;

/**
 * Accept only an app-internal absolute path. A single leading slash is
 * required so protocol-relative, scheme, backslash and control-character
 * redirects fail closed.
 */
export function safeAuthReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (
    value.includes("\\") ||
    CONTROL_CHARACTER.test(value) ||
    SCHEME_AFTER_ROOT.test(value)
  ) {
    return null;
  }

  // URLSearchParams decodes once. Inspect two further encoding layers so an
  // encoded protocol-relative path or backslash cannot become dangerous later.
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      CONTROL_CHARACTER.test(decoded) ||
      SCHEME_AFTER_ROOT.test(decoded)
    ) {
      return null;
    }
  }

  return value;
}

export function authReturnPathFromLoginHref(href: string): string {
  try {
    const url = new URL(href);
    return (
      safeAuthReturnPath(url.searchParams.get("next")) ??
      DEFAULT_AUTH_RETURN_PATH
    );
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }
}

export function storeAuthReturnPath(
  storage: SessionStorageLike,
  href: string
): string {
  const path = authReturnPathFromLoginHref(href);
  try {
    storage.setItem(AUTH_RETURN_PATH_STORAGE_KEY, path);
  } catch {
    // A blocked/full sessionStorage must not prevent sign-in.
  }
  return path;
}

export function consumeAuthReturnPath(storage: SessionStorageLike): string {
  let stored: string | null = null;
  try {
    stored = storage.getItem(AUTH_RETURN_PATH_STORAGE_KEY);
  } catch {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  try {
    storage.removeItem(AUTH_RETURN_PATH_STORAGE_KEY);
  } catch {
    // Do not use a value that could not be consumed exactly once.
    return DEFAULT_AUTH_RETURN_PATH;
  }

  return safeAuthReturnPath(stored) ?? DEFAULT_AUTH_RETURN_PATH;
}
