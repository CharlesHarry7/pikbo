"use client";

import { useState } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { createRemixHref } from "@/lib/remixIntent";

const LOGIN_GUEST_GENERATE_HREF = createRemixHref("360-spin-showcase");

type AuthPublic = {
  configured: boolean;
  providers: { emailMagicLink: boolean; google: boolean };
  mode: string;
  message: string;
};

export function LoginForm({ auth }: { auth: AuthPublic }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!auth.configured) {
    return (
      <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-white/15 bg-black/40 p-5">
        <p className="text-sm font-semibold text-white">Sign-in not live yet</p>
        <p className="text-xs leading-relaxed text-white/55">
          Supabase Auth keys are not configured on this deployment. Your guest
          cookie still works for Generate, Modules, Seller Starter Pack, and this-device
          Library.
        </p>
        <div
          className="flex flex-wrap items-center gap-2 pt-1"
          data-auth-guest-path="product-first"
        >
          <a
            href={LOGIN_GUEST_GENERATE_HREF}
            className="btn btn-primary !px-3 !py-1.5 text-xs"
            data-login-guest="generate-remix"
          >
            Generate
          </a>
          <a
            href="/create?mode=seller-pack"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
          >
            Seller Starter Pack
          </a>
          <a href="/library" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Library
          </a>
          <a href="/modules" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Modules
          </a>
          <FreeTrialCta
            path="/login"
            variant="ghost"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
          />
        </div>
        <p className="text-[10px] leading-relaxed text-white/40">
          Guest cookie is still generate authority · durable wallet needs
          Supabase keys (shadow until Mode B).
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        retryAfterSec?: number;
      };
      if (!res.ok || !data.ok) {
        const wait =
          typeof data.retryAfterSec === "number" && data.retryAfterSec > 0
            ? ` · try again in ${data.retryAfterSec}s`
            : res.status === 429
              ? " · try again in a moment"
              : "";
        setErr((data.error || "Could not send magic link") + wait);
        return;
      }
      setNote(
        data.message ||
          "Check your email for a magic link. You can close this tab after clicking it."
      );
    } catch {
      setErr("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (!auth.providers.google) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setErr(
          "Browser Supabase client not ready. Set NEXT_PUBLIC_SUPABASE_URL and ANON key."
        );
        return;
      }
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setErr(error.message.slice(0, 160));
      }
      // Browser navigates to Google on success.
    } catch {
      setErr("Could not start Google sign-in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-xs font-semibold text-white/70">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--mint)]"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "Sending…" : "Email magic link"}
        </button>
      </form>

      {auth.providers.google ? (
        <>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onGoogle()}
            className="btn btn-ghost w-full py-2.5 text-sm disabled:opacity-50"
          >
            Continue with Google
          </button>
        </>
      ) : (
        <p className="text-[10px] leading-relaxed text-white/35">
          Google sign-in is gated off until{" "}
          <code className="text-white/50">SUPABASE_AUTH_GOOGLE=1</code> and
          Google provider is enabled in Supabase.
        </p>
      )}

      {note && (
        <p className="text-xs leading-relaxed text-[var(--mint)]">{note}</p>
      )}
      {err && (
        <p className="text-xs leading-relaxed text-amber-200" role="alert">
          {err}
        </p>
      )}
      <p className="text-[10px] leading-relaxed text-white/40">
        Keys are on this server. First sign-in may need Email provider enabled in
        Supabase Authentication → Providers. Guest cookie still works without
        signing in.
      </p>
    </div>
  );
}
