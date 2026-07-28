"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { emitSessionRefresh } from "@/lib/sessionEvents";
import {
  completeAuthCallback,
  parseAuthCallbackUrl,
} from "@/lib/authCallback";

/**
 * Email magic-link lands here with ?code=...
 * Exchanges the code for a session, claims durable Free account + one-time
 * guest credit migration, then sends the user to Profile.
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [detail, setDetail] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const intent = parseAuthCallbackUrl(window.location.href);
      if (intent.kind === "error") {
        if (!cancelled) {
          setStatus("error");
          setDetail(intent.detail);
        }
        return;
      }

      const supabase = getSupabaseBrowser();
      if (!supabase) {
        if (!cancelled) {
          setStatus("error");
          setDetail(
            "Browser Supabase client not ready. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set, then restart dev server."
          );
        }
        return;
      }
      const result = await completeAuthCallback(supabase.auth, intent);
      if (!result.ok) {
        if (!cancelled) {
          setStatus("error");
          setDetail(result.detail);
        }
        return;
      }

      try {
        const claimRes = await fetch("/api/auth/claim", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${result.accessToken}`,
            "Content-Type": "application/json",
          },
        });
        const claim = (await claimRes.json()) as {
          ok?: boolean;
          guestMigration?: { migratedCredits?: number; note?: string };
          error?: string;
        };
        if (claimRes.ok && claim.ok) {
          const n = claim.guestMigration?.migratedCredits ?? 0;
          if (!cancelled) {
            setDetail(
              n > 0
                ? `Signed in · migrated ${n} guest credits. Redirecting…`
                : "Signed in · durable Free account ready. Redirecting…"
            );
          }
        }
      } catch {
        // Claim is best-effort; the verified session remains authoritative.
      }

      emitSessionRefresh();
      if (!cancelled) {
        setStatus("ok");
        setDetail((detail) =>
          detail.startsWith("Signed in")
            ? detail
            : "Signed in. Redirecting…"
        );
        window.setTimeout(() => {
          window.location.replace("/profile");
        }, 700);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className="mx-auto max-w-md px-4 py-16 text-center"
      data-auth-callback-status={status}
    >
      <h1 className="font-display text-2xl font-black uppercase tracking-tight">
        {status === "ok"
          ? "Welcome back"
          : status === "error"
            ? "Sign-in issue"
            : "Almost there"}
      </h1>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">{detail}</p>
      {status === "error" && (
        <Link
          href="/login"
          className="mt-6 inline-block text-[var(--mint)] hover:underline"
        >
          Request a new magic link
        </Link>
      )}
    </main>
  );
}
