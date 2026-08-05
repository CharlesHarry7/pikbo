"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const LOGIN_GUEST_MOMENT_HREF = `${MOMENT_CREATE_HREF}&source=login-guest`;

type AuthPublic = {
  configured: boolean;
  providers: { emailMagicLink: boolean; google: boolean };
  mode: string;
  message: string;
};

export function LoginForm({ auth, next }: { auth: AuthPublic; next: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!auth.configured) {
    return (
      <div
        className="status-card status-card--warn mt-5 space-y-3 p-5"
        data-tone="warn"
        data-login-form="unavailable"
      >
        <p className="text-sm font-black tracking-tight text-white">
          Sign-in is temporarily unavailable
        </p>
        <p className="text-xs font-semibold leading-relaxed text-white/55">
          You can still try a cached Moment and Library on this device. Cached
          Lab previews cost 0 credits and do not process your upload.
        </p>
        <div
          className="flex flex-wrap items-center gap-2 pt-1"
          data-auth-guest-path="product-first"
        >
          <a
            href={LOGIN_GUEST_MOMENT_HREF}
            className="btn btn-primary !px-3 !py-1.5 text-xs"
            data-login-guest="moment-preview"
          >
            Preview Street Power-Up
          </a>
          <a href="/library" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Library
          </a>
          <Link
            href="/#home-create"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
          >
            Home samples
          </Link>
          <a href="/pricing" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Plans
          </a>
        </div>
        <p className="text-[10px] leading-relaxed text-white/40">
          Real generation and cross-device Library require sign-in. Please try
          again later.
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
        body: JSON.stringify({ email: email.trim(), next }),
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
        setErr(
          (res.status === 429
            ? "Too many sign-in requests"
            : "We couldn't send the sign-in link. Please try again.") + wait
        );
        return;
      }
      setNote(
        data.message ||
          "Check your inbox for a Pikbo sign-in link. Open it in this browser; check spam if needed."
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
          "Google sign-in is temporarily unavailable. Try email sign-in instead."
        );
        return;
      }
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setErr(
          "Google sign-in is temporarily unavailable. Try email sign-in instead."
        );
      }
      // Browser navigates to Google on success.
    } catch {
      setErr(
        "Google sign-in is temporarily unavailable. Try email sign-in instead."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="login-form-panel mt-3 space-y-3 sm:mt-5 sm:space-y-4"
      data-login-form="magic-link"
    >
      <form className="space-y-2.5 sm:space-y-3.5" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            className="login-email-field mt-1.5 w-full rounded-xl border border-white/12 bg-black/45 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/28 focus:border-[var(--neon-pink)] focus:shadow-[0_0_0_3px_rgba(255,78,205,0.18)] sm:mt-2 sm:px-3.5 sm:py-3"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full py-2.5 text-sm font-black disabled:opacity-50 sm:py-3"
          data-login-submit="magic-link"
        >
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>

      {auth.providers.google ? (
        <>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onGoogle()}
            className="btn-electric w-full py-2.5 text-sm font-black disabled:opacity-50 sm:py-3"
            data-login-submit="google"
          >
            Continue with Google
          </button>
        </>
      ) : (
        <p className="text-[10px] leading-relaxed text-white/35">
          Google sign-in isn&apos;t available. Use the email link above.
        </p>
      )}

      {note && (
        <div
          className="status-card status-card--ok p-3.5"
          data-tone="ready"
          data-auth-awaiting-email="true"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--tide-green)]">
            Link sent
          </p>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/80">
            {note}
          </p>
        </div>
      )}
      {err && (
        <div
          className="status-card status-card--err p-3.5"
          data-tone="warn"
          role="alert"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lemon)]">
            Try again
          </p>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-amber-100">
            {err}
          </p>
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-white/40">
        We&apos;ll email a secure sign-in link. Open it in the same browser
        where you requested it.
      </p>
    </div>
  );
}
