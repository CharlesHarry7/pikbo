import { getSupabaseAdmin } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_OPTIONS = new Set(["seller", "studio", "collector", "other"]);

export type BetaRequestInput = {
  email: string;
  role: string;
  shopUrl?: string;
  sourcePath?: string;
  consent: boolean;
};

export type NormalizedBetaRequest = {
  email: string;
  role: string;
  shopUrl: string | null;
  sourcePath: string;
  consentAt: string;
};

export function normalizeBetaRequest(
  input: Partial<BetaRequestInput>
):
  | { ok: true; value: NormalizedBetaRequest }
  | { ok: false; code: string; error: string } {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { ok: false, code: "INVALID_EMAIL", error: "Enter a valid email address." };
  }

  const role = typeof input.role === "string" ? input.role.trim() : "";
  if (!ROLE_OPTIONS.has(role)) {
    return { ok: false, code: "INVALID_ROLE", error: "Choose the option that best describes you." };
  }

  const shopUrl = typeof input.shopUrl === "string" ? input.shopUrl.trim() : "";
  if (shopUrl.length > 500) {
    return { ok: false, code: "INVALID_SHOP_URL", error: "Shop link is too long." };
  }
  if (shopUrl) {
    try {
      const parsed = new URL(shopUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    } catch {
      return { ok: false, code: "INVALID_SHOP_URL", error: "Use a full http(s) shop link." };
    }
  }

  if (input.consent !== true) {
    return { ok: false, code: "CONSENT_REQUIRED", error: "Consent is required to request access." };
  }

  const sourcePath =
    typeof input.sourcePath === "string" && input.sourcePath.startsWith("/")
      ? input.sourcePath.slice(0, 240)
      : "/contact";

  return {
    ok: true,
    value: {
      email,
      role,
      shopUrl: shopUrl || null,
      sourcePath,
      consentAt: new Date().toISOString(),
    },
  };
}

export async function createBetaRequest(value: NormalizedBetaRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false as const,
      code: "NOT_CONFIGURED",
      error: "Beta applications are temporarily unavailable.",
    };
  }

  const existing = await admin
    .from("beta_requests")
    .select("id,status")
    .eq("email", value.email)
    .in("status", ["pending", "approved", "contacted"])
    .limit(1)
    .maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") {
    return { ok: false as const, code: "STORAGE_ERROR", error: "Could not save the request." };
  }
  if (existing.data) {
    return { ok: true as const, duplicate: true, status: existing.data.status as string };
  }

  const inserted = await admin
    .from("beta_requests")
    .insert({
      email: value.email,
      role: value.role,
      shop_url: value.shopUrl,
      source_path: value.sourcePath,
      consent_at: value.consentAt,
    })
    .select("id,status")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      return { ok: true as const, duplicate: true, status: "pending" };
    }
    return { ok: false as const, code: "STORAGE_ERROR", error: "Could not save the request." };
  }
  return { ok: true as const, duplicate: false, status: inserted.data.status as string };
}
