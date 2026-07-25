/**
 * Supabase env helpers — never log full keys.
 */

/**
 * Normalize project URL for @supabase/supabase-js.
 * Common misconfig: paste of /rest/v1 or /auth/v1 path → PostgREST
 * "Invalid path specified in request URL" and schemaReady=false.
 */
export function supabaseUrl(): string | null {
  const u =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  if (!u.startsWith("http")) return null;
  try {
    const parsed = new URL(u);
    // Strip accidental API subpaths — client appends /rest/v1 itself.
    let path = parsed.pathname.replace(/\/+$/, "");
    path = path
      .replace(/\/rest\/v1$/i, "")
      .replace(/\/auth\/v1$/i, "")
      .replace(/\/storage\/v1$/i, "");
    if (path === "/" || path === "") {
      parsed.pathname = "";
    } else {
      parsed.pathname = path;
    }
    // No query/hash on project root
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Desensitized URL host for health (no keys). */
export function supabaseUrlHost(): string | null {
  const u = supabaseUrl();
  if (!u) return null;
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
}

export function supabaseAnonKey(): string | null {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  return k.length > 10 ? k : null;
}

export function supabaseServiceRoleKey(): string | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  return k.length > 10 ? k : null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
