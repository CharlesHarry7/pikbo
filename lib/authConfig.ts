/**
 * Auth availability — environment-gated (T5 / Phase C).
 * No Supabase SDK hard dependency until keys exist.
 */

export type AuthProviderStatus = {
  /** Magic link / Google can be offered in UI */
  configured: boolean;
  providers: {
    emailMagicLink: boolean;
    google: boolean;
  };
  supabaseUrl: boolean;
  supabaseAnon: boolean;
  /** Service role is server-only; never expose to client */
  serviceRolePresent: boolean;
  mode: "disabled" | "supabase" | "local-durable-only";
  message: string;
};

export function getAuthProviderStatus(): AuthProviderStatus {
  const supabaseUrl = Boolean(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseAnon = Boolean(
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serviceRolePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const configured = supabaseUrl && supabaseAnon;
  const localDurable =
    process.env.DURABLE_CREDITS === "local" ||
    process.env.DURABLE_CREDITS === "1";

  if (configured) {
    return {
      configured: true,
      providers: {
        emailMagicLink: true,
        google: process.env.SUPABASE_AUTH_GOOGLE === "1",
      },
      supabaseUrl,
      supabaseAnon,
      serviceRolePresent,
      mode: "supabase",
      message: "Email sign-in is available.",
    };
  }

  if (localDurable) {
    return {
      configured: false,
      providers: { emailMagicLink: false, google: false },
      supabaseUrl,
      supabaseAnon,
      serviceRolePresent,
      mode: "local-durable-only",
      message:
        "Sign-in is temporarily unavailable. You can still try cached Lab previews.",
    };
  }

  return {
    configured: false,
    providers: { emailMagicLink: false, google: false },
    supabaseUrl,
    supabaseAnon,
    serviceRolePresent,
    mode: "disabled",
    message:
      "Sign-in is temporarily unavailable. You can still try cached Lab previews.",
  };
}

/** Safe for client components via a thin API — never includes secrets. */
export function publicAuthStatus() {
  const s = getAuthProviderStatus();
  return {
    configured: s.configured,
    providers: s.providers,
    mode: s.mode,
    message: s.message,
  };
}
