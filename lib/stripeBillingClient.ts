"use client";

/** Paid checkout/confirm always binds to the current Supabase user. */
export async function stripeBillingAuthHeaders(): Promise<HeadersInit> {
  const { getSupabaseBrowser } = await import("@/lib/supabase/browser");
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Sign in before subscribing.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token?.trim();
  if (!token) throw new Error("Sign in before subscribing.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
