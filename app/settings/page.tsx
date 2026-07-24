"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearHistory,
  loadHistory,
  remoteClipMayExpire,
} from "@/lib/history";
import {
  fetchMe,
  freeTrialExhausted,
  type MeResponse,
} from "@/lib/meClient";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";

export default function SettingsPage() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [libCount, setLibCount] = useState(0);
  const [agingCount, setAgingCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  function refreshLocal() {
    const list = loadHistory();
    setLibCount(list.length);
    setAgingCount(list.filter((i) => remoteClipMayExpire(i)).length);
  }

  useEffect(() => {
    void fetchMe().then(setSession);
    const t = window.setTimeout(() => {
      refreshLocal();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  function clearKey(key: string, label: string) {
    try {
      localStorage.removeItem(key);
      setMsg(`Cleared ${label}`);
      refreshLocal();
    } catch {
      setMsg("Could not clear");
    }
  }

  const mode = session?.mode ?? "—";
  const demoMode = session?.mode === "demo-cached";
  const liveMode = session?.mode === "live-generate";
  const perJob = session?.liveJobCredits ?? CREDITS_PER_VIDEO;
  const trialDone = freeTrialExhausted(session);
  const freeLive = session?.freeTrial?.freeLive;
  const clipsLeft =
    typeof session?.freeTrial?.clipsLeft === "number"
      ? session.freeTrial.clipsLeft
      : session
        ? Math.floor(session.credits / perJob)
        : null;
  const isFreePlan =
    session?.freeTrial?.isFreePlan === true || session?.plan === "free";

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg">
        <span className="chip">Settings</span>
        <h1 className="mt-3 text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Device data & session. Signed-in durable wallets use local file or
          Supabase Postgres when the T5 migration is applied.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/create" className="btn btn-primary !px-3 !py-1.5 text-xs">
            Generate
          </Link>
          <Link href="/modules" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Modules
          </Link>
          <Link href="/library" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            Library · {libCount}
          </Link>
          <Link href="/status" className="btn btn-ghost !px-3 !py-1.5 text-xs">
            System status
          </Link>
        </div>

        <div className="card mt-8 space-y-4 p-6 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Sign-in</span>
            <span className="font-semibold">
              {session?.signedIn
                ? session.auth?.email || "Signed in"
                : "Guest cookie"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Durable ledger</span>
            <span className="text-right font-semibold">
              {session?.durable?.backend
                ? `${session.durable.backend} · ${session.durable.availableCredits} cr`
                : session?.durableCreditsActive
                  ? "shadow ready · no wallet yet"
                  : "off"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Plan</span>
            <span className="font-semibold">{session?.planName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Credits (cookie)</span>
            <span className="font-semibold text-[var(--mint)]">
              {session?.credits ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Free Mini trial</span>
            <span
              className={`text-right font-semibold ${
                trialDone && isFreePlan ? "text-amber-200" : ""
              }`}
            >
              {!session
                ? "—"
                : demoMode
                  ? "n/a · demo-cached"
                  : !isFreePlan
                    ? "paid path · not Free trial"
                    : trialDone
                      ? "exhausted · demos still free"
                      : freeLive
                        ? `~${clipsLeft} left · ${freeLive.resolution} ${freeLive.durationSec}s`
                        : `~${clipsLeft} live left`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Live clips left (est.)</span>
            <span className="font-semibold">
              {clipsLeft !== null ? clipsLeft : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Generate mode</span>
            <span
              className={`text-right font-semibold ${
                demoMode ? "text-[var(--fg-dim)]" : "text-[var(--mint)]"
              }`}
            >
              {demoMode
                ? "demo-cached · free labeled demos"
                : mode === "live-generate"
                  ? "live-generate · Seedance"
                  : mode}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Cached demos</span>
            <span className="font-semibold">
              {session?.cachedDemoFree === false ? "may charge" : "0 credits"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Free raw download</span>
            <span className="font-semibold text-amber-100/90">
              blocked · T6 bake pending
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Library clips</span>
            <span className="font-semibold">{libCount}</span>
          </div>
          {agingCount > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--fg-muted)]">Aging CDN links</span>
              <span className="font-semibold text-amber-600">
                {agingCount} · download soon
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--fg-muted)]">Video engine</span>
            <span className="font-semibold">
              {liveMode ? "Seedance (ByteDance)" : "Cached Lab demos"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--fg-dim)]">
            Soft-live needs <code className="text-[var(--fg-muted)]">SESSION_SECRET</code>{" "}
            + <code className="text-[var(--fg-muted)]">FAL_KEY</code> on the
            server. Paid needs durable entitlements + Stripe (see LAUNCH.md on
            the repo). Free Mini trial state comes from{" "}
            <code className="text-[var(--fg-muted)]">GET /api/me</code>{" "}
            freeTrial — not a client guess.
          </p>
        </div>

        <div className="card mt-4 space-y-2 p-6">
          <h2 className="font-semibold">Clear device data</h2>
          <button
            type="button"
            className="btn btn-ghost w-full text-sm"
            onClick={() => {
              clearHistory();
              setMsg("Library cleared");
              refreshLocal();
            }}
          >
            Clear library
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full text-sm"
            onClick={() => clearKey("pikbo_favorite_effects", "favorites")}
          >
            Clear favorites
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full text-sm"
            onClick={() => clearKey("pikbo_recent_effects", "recent presets")}
          >
            Clear recent presets
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full text-sm"
            onClick={() => clearKey("pikbo_onboard_v1", "onboarding flag")}
          >
            Reset onboarding banner
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full text-sm"
            onClick={() => clearKey("pikbo_image_library_v1", "still library")}
          >
            Clear still library
          </button>
          {msg && (
            <p className="text-center text-xs text-[var(--mint)]">{msg}</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/profile" className="text-[var(--brand)] hover:underline">
            Profile
          </Link>
          <Link href="/pricing" className="text-[var(--brand)] hover:underline">
            Pricing
          </Link>
          <Link href="/library" className="text-[var(--brand)] hover:underline">
            Library
          </Link>
          <Link href="/privacy" className="text-[var(--fg-dim)] hover:underline">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
