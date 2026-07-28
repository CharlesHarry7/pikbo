export type AuthCallbackIntent =
  | { kind: "code"; code: string }
  | { kind: "session" }
  | { kind: "error"; detail: string; code: string };

type AuthCallbackClient = {
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  getSession(): Promise<{
    data: { session: { access_token?: string | null } | null };
    error: unknown;
  }>;
};

export type AuthCallbackResult =
  | { ok: true; accessToken: string }
  | {
      ok: false;
      reason: "provider" | "exchange" | "missing_session";
      detail: string;
    };

const EXPIRED_LINK_DETAIL =
  "This sign-in link has expired or was already used. Request a new magic link.";

function safeText(value: string | null): string {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return safeText(error.message);
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return safeText(error.message);
  }
  return "";
}

function providerErrorDetail(code: string, description: string): string {
  const combined = `${code} ${description}`.toLowerCase();
  if (/otp_expired|expired|invalid.*otp|token.*expired/.test(combined)) {
    return EXPIRED_LINK_DETAIL;
  }
  if (/access_denied|denied|rejected/.test(combined)) {
    return "This sign-in link was rejected. Request a new magic link and try again.";
  }
  if (/signup.*disabled|user.*disabled/.test(combined)) {
    return "Email sign-in is not available for this account. Contact Pikbo support.";
  }
  return description
    ? `Pikbo could not complete sign-in: ${description}. Request a new magic link.`
    : "Pikbo could not complete sign-in. Request a new magic link.";
}

function clientErrorDetail(error: unknown): string {
  const message = errorMessage(error);
  const lower = message.toLowerCase();
  if (/expired|invalid.*otp|otp.*invalid|token.*expired/.test(lower)) {
    return EXPIRED_LINK_DETAIL;
  }
  if (/pkce|code verifier/.test(lower)) {
    return "This link must be opened in the same browser that requested it. Request a new magic link on this device.";
  }
  return "Pikbo could not establish a valid session. Request a new magic link and try again.";
}

export function parseAuthCallbackUrl(href: string): AuthCallbackIntent {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return {
      kind: "error",
      code: "invalid_callback_url",
      detail: "This sign-in link is invalid. Request a new magic link.",
    };
  }

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const read = (name: string) =>
    url.searchParams.get(name) || hash.get(name) || "";
  const providerError = safeText(read("error"));
  const providerCode = safeText(read("error_code"));
  const providerDescription = safeText(read("error_description"));

  if (providerError || providerCode || providerDescription) {
    const code = providerCode || providerError || "provider_error";
    return {
      kind: "error",
      code,
      detail: providerErrorDetail(code, providerDescription),
    };
  }

  const code = safeText(read("code"));
  return code ? { kind: "code", code } : { kind: "session" };
}

export async function completeAuthCallback(
  auth: AuthCallbackClient,
  intent: AuthCallbackIntent
): Promise<AuthCallbackResult> {
  if (intent.kind === "error") {
    return {
      ok: false,
      reason: "provider",
      detail: intent.detail,
    };
  }

  if (intent.kind === "code") {
    const { error } = await auth.exchangeCodeForSession(intent.code);
    if (error) {
      return {
        ok: false,
        reason: "exchange",
        detail: clientErrorDetail(error),
      };
    }
  }

  const { data, error } = await auth.getSession();
  if (error) {
    return {
      ok: false,
      reason: "exchange",
      detail: clientErrorDetail(error),
    };
  }

  const accessToken = data.session?.access_token?.trim() || "";
  if (!accessToken) {
    return {
      ok: false,
      reason: "missing_session",
      detail:
        intent.kind === "session"
          ? "No valid sign-in code or session was found. Request a new magic link."
          : "The sign-in link did not create a session. Request a new magic link.",
    };
  }

  return { ok: true, accessToken };
}
