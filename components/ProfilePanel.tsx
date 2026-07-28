"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadHistory } from "@/lib/history";
import {
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { createRemixHref } from "@/lib/remixIntent";
import { SESSION_EVENT } from "@/lib/sessionEvents";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

const PROFILE_GENERATE_HREF = createRemixHref("360-spin-showcase");

type DurableClaim = {
  signedIn: boolean;
  email: string | null;
  availableCredits: number | null;
  migratedNote: string | null;
  /** From claim / me — honest store label */
  backend: "supabase" | "local-file" | null;
  reservedCredits: number | null;
};

type SessionJobsProbe = {
  open: number;
  total: number;
  failed?: number;
  canceled?: number;
};

/** Process-memory Flux still ledger (HEAD /api/image) — Settings parity. */
type ImageJobsProbe = {
  open: number;
  total: number;
  queued?: number;
  failed?: number;
  canceled?: number;
};

export function ProfilePanel() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [clips, setClips] = useState(0);
  const [jobsProbe, setJobsProbe] = useState<SessionJobsProbe | null>(null);
  const [imageJobsProbe, setImageJobsProbe] = useState<ImageJobsProbe | null>(
    null
  );
  const [auth, setAuth] = useState<DurableClaim>({
    signedIn: false,
    email: null,
    availableCredits: null,
    migratedNote: null,
    backend: null,
    reservedCredits: null,
  });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    function refreshGuest() {
      void fetchMe().then((d) => {
        if (d) setSession(d);
      });
      setClips(loadHistory().length);
    }

    async function refreshJobsProbe() {
      try {
        const res = await fetch("/api/generations", { method: "HEAD" });
        if (!res.ok) {
          setJobsProbe(null);
          return;
        }
        const open = Number(res.headers.get("X-Pikbo-Jobs-Open") || "0");
        const total = Number(res.headers.get("X-Pikbo-Jobs") || "0");
        const failed = Number(res.headers.get("X-Pikbo-Jobs-Failed") || "0");
        const canceled = Number(
          res.headers.get("X-Pikbo-Jobs-Canceled") || "0"
        );
        setJobsProbe({
          open: Number.isFinite(open) ? open : 0,
          total: Number.isFinite(total) ? total : 0,
          failed: Number.isFinite(failed) ? failed : 0,
          canceled: Number.isFinite(canceled) ? canceled : 0,
        });
      } catch {
        setJobsProbe(null);
      }
    }

    async function refreshImageJobsProbe() {
      try {
        // Session-scoped HEAD — sweeps TIMEOUT so open never sticks after kill.
        const res = await fetch("/api/image", { method: "HEAD" });
        if (!res.ok) {
          setImageJobsProbe(null);
          return;
        }
        const total = Number(res.headers.get("X-Pikbo-Image-Jobs") || "0");
        const open = Number(res.headers.get("X-Pikbo-Image-Jobs-Open") || "0");
        const queued = Number(
          res.headers.get("X-Pikbo-Image-Jobs-Queued") || "0"
        );
        const failed = Number(
          res.headers.get("X-Pikbo-Image-Jobs-Failed") || "0"
        );
        const canceled = Number(
          res.headers.get("X-Pikbo-Image-Jobs-Canceled") || "0"
        );
        setImageJobsProbe({
          open: Number.isFinite(open) ? open : 0,
          total: Number.isFinite(total) ? total : 0,
          queued: Number.isFinite(queued) ? queued : 0,
          failed: Number.isFinite(failed) ? failed : 0,
          canceled: Number.isFinite(canceled) ? canceled : 0,
        });
      } catch {
        setImageJobsProbe(null);
      }
    }

    async function refreshAuth() {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setAuth({
          signedIn: false,
          email: null,
          availableCredits: null,
          migratedNote: null,
          backend: null,
          reservedCredits: null,
        });
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const email = data.session?.user?.email ?? null;
      if (!token) {
        setAuth({
          signedIn: false,
          email: null,
          availableCredits: null,
          migratedNote: null,
          backend: null,
          reservedCredits: null,
        });
        return;
      }
      try {
        // Claim is idempotent — ensures wallet + one-time guest migrate.
        const res = await fetch("/api/auth/claim", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const body = (await res.json()) as {
          ok?: boolean;
          user?: { email?: string | null };
          wallet?: {
            availableCredits?: number;
            reservedCredits?: number;
            backend?: "supabase" | "local-file";
          };
          guestMigration?: { note?: string; migratedCredits?: number };
        };
        if (res.ok && body.ok) {
          setAuth({
            signedIn: true,
            email: body.user?.email ?? email,
            availableCredits:
              typeof body.wallet?.availableCredits === "number"
                ? body.wallet.availableCredits
                : null,
            reservedCredits:
              typeof body.wallet?.reservedCredits === "number"
                ? body.wallet.reservedCredits
                : null,
            backend: body.wallet?.backend ?? null,
            migratedNote: body.guestMigration?.note ?? null,
          });
        } else {
          setAuth({
            signedIn: true,
            email,
            availableCredits: null,
            reservedCredits: null,
            backend: null,
            migratedNote: null,
          });
        }
      } catch {
        setAuth({
          signedIn: true,
          email,
          availableCredits: null,
          reservedCredits: null,
          backend: null,
          migratedNote: null,
        });
      }
    }

    function refresh() {
      refreshGuest();
      void refreshAuth();
      void refreshJobsProbe();
      void refreshImageJobsProbe();
    }

    const t = window.setTimeout(refresh, 0);
    window.addEventListener(SESSION_EVENT, refresh);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(SESSION_EVENT, refresh);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowser();
      await supabase?.auth.signOut();
      setAuth({
        signedIn: false,
        email: null,
        availableCredits: null,
        migratedNote: null,
        backend: null,
        reservedCredits: null,
      });
    } finally {
      setSigningOut(false);
    }
  }

  const perJob = session?.liveJobCredits ?? CREDITS_PER_VIDEO;
  const demo = isDemoMode(session);
  // Prefer /api/me durable (Bearer) then claim wallet — cookie is not live-spend authority (R0).
  const durableBackend =
    session?.durable?.backend ?? auth.backend ?? null;
  const durableAvailable =
    session?.durable && typeof session.durable.availableCredits === "number"
      ? session.durable.availableCredits
      : auth.availableCredits;
  const durableReserved =
    session?.durable && typeof session.durable.reservedCredits === "number"
      ? session.durable.reservedCredits
      : auth.reservedCredits;
  const displayCredits =
    auth.signedIn && durableAvailable !== null
      ? durableAvailable
      : session?.credits;
  const trialDone = freeTrialExhausted(session);
  const freeLive = session?.freeTrial?.freeLive;
  const clipsLeft =
    typeof session?.freeTrial?.clipsLeft === "number"
      ? session.freeTrial.clipsLeft
      : displayCredits !== undefined && displayCredits !== null
        ? Math.floor(Number(displayCredits) / perJob)
        : null;
  const isFreePlan =
    session?.freeTrial?.isFreePlan === true || session?.plan === "free";

  const durableLine = !auth.signedIn
    ? "Guest cookie · this device only · not live-spend authority"
    : durableBackend === "supabase"
      ? "Supabase account · durable wallet (Postgres) · live needs atomic reserve (cookie is not live-spend authority)"
      : durableBackend === "local-file"
        ? "Supabase account · durable wallet is single-node file ledger (shadow) — apply T5 SQL for multi-node"
        : "Supabase account · durable wallet pending claim/probe";

  const planLabel = isFreePlan
    ? "Free plan"
    : session?.planName || session?.plan || "Plan";
  const trialStatusLabel = !isFreePlan
    ? "N/A"
    : trialDone
      ? "Used"
      : "Available";

  return (
    <div className="card mt-8 space-y-4 p-6">
      {/* Default-visible account home — plain language only */}
      <div
        className="space-y-4"
        data-profile-account-home="user-facing"
        data-profile-default-visible
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl"
            style={{ background: "var(--grad)" }}
          >
            🧸
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-dim)]">
              Email
            </p>
            <p
              className="truncate font-semibold"
              data-profile-email
            >
              {auth.signedIn
                ? auth.email || "Signed-in creator"
                : "Guest on this device"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-3">
            <p className="text-[10px] text-[var(--fg-dim)]">Plan</p>
            <p
              className="mt-0.5 text-sm font-bold"
              data-profile-plan="free-or-named"
            >
              {session || auth.signedIn
                ? isFreePlan
                  ? "Free plan"
                  : planLabel
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-3">
            <p className="text-[10px] text-[var(--fg-dim)]">
              {auth.signedIn ? "Account credits" : "Device credits"}
            </p>
            <p
              className="mt-0.5 text-sm font-bold text-[var(--mint)]"
              data-profile-account-credits
            >
              {displayCredits ?? "—"}
            </p>
          </div>
        </div>

        <div
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
          data-profile-trial-status
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-dim)]">
            One-time trial status
          </p>
          <p
            className={`mt-1 text-sm font-bold ${
              trialStatusLabel === "Used" ? "text-amber-200" : ""
            }`}
            data-profile-trial-eligibility={trialStatusLabel.toLowerCase()}
          >
            {trialStatusLabel}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--fg-muted)]">
            One-time trial eligibility is separate from your account credits.
            {isFreePlan
              ? trialDone
                ? " Status: Used."
                : " Status: Available."
              : " Free plan only."}
          </p>
        </div>

        {auth.signedIn ? (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="btn btn-ghost w-full text-sm disabled:opacity-50"
            data-profile-sign-out
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        ) : (
          <Link
            href="/login"
            className="btn btn-ghost w-full text-sm"
            data-profile-sign-in
          >
            Sign in
          </Link>
        )}
      </div>

      {/* Ops probes + engineering honesty — collapsed by default */}
      <details
        className="rounded-xl border border-white/10 bg-white/[0.02]"
        data-profile-account-diagnostics="collapsed-default"
      >
        <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-semibold text-[var(--fg-dim)]">
          Account diagnostics
        </summary>
        <div className="space-y-3 border-t border-white/10 px-3 py-3">
          {/* product-first residual paths — kept for engine-smoke, not default home */}
          <div
            className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
            data-profile-path="product-first"
          >
            <Link
              href={PROFILE_GENERATE_HREF}
              className="btn btn-primary w-full px-3 py-1.5 text-xs"
              data-profile-generate="remix"
            >
              Create a video
            </Link>
            <Link
              href="/library"
              className="btn btn-ghost w-full px-3 py-1.5 text-xs"
            >
              Open Library · {clips}
            </Link>
          </div>

          <p className="text-xs text-[var(--fg-dim)]">
            {durableLine}
            {demo ? " · demo-cached mode" : ""}
          </p>

          {auth.signedIn && auth.migratedNote ? (
            <p className="rounded-xl border border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[var(--fg-muted)]">
              {auth.migratedNote}
            </p>
          ) : null}

          {auth.signedIn ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]">
              <span className="font-semibold text-white/80">
                Credits authority
              </span>
              {" · "}
              Cookie is{" "}
              <span className="font-semibold text-white/75">
                not live-spend authority
              </span>{" "}
              (R0). Display cookie balance {session?.credits ?? "—"} cr · live
              needs durable atomic reserve or labeled cached demos. Durable
              wallet
              {durableBackend ? ` (${durableBackend}` : ""}
              {session?.durable?.authority
                ? ` · ${session.durable.authority}`
                : durableBackend
                  ? " · shadow"
                  : ""}
              {durableBackend ? ")" : ""} is for cross-device audit
              {durableReserved !== null && durableReserved > 0
                ? ` · ${durableReserved} reserved`
                : ""}
              . Not multi-node until T5 SQL is applied.
            </div>
          ) : null}

          {jobsProbe && (jobsProbe.open > 0 || jobsProbe.total > 0) ? (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]"
              data-profile-jobs="video"
            >
              <span className="font-semibold text-white/80">
                Session video jobs
              </span>
              {" · "}
              {jobsProbe.open > 0
                ? `${jobsProbe.open} open (queued/running) · `
                : null}
              {jobsProbe.total} in process-memory ledger this instance
              {(jobsProbe.failed ?? 0) > 0 || (jobsProbe.canceled ?? 0) > 0
                ? ` · ${jobsProbe.failed ?? 0} failed · ${jobsProbe.canceled ?? 0} canceled`
                : ""}{" "}
              —{" "}
              <Link
                href="/library"
                className="font-semibold text-[var(--mint)] underline-offset-2 hover:underline"
              >
                Library recovery
              </Link>
              . Not multi-node cloud.
            </div>
          ) : null}

          {imageJobsProbe &&
          (imageJobsProbe.open > 0 || imageJobsProbe.total > 0) ? (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]"
              data-profile-jobs="image"
            >
              <span className="font-semibold text-white/80">
                Still image jobs
              </span>
              {" · "}
              {imageJobsProbe.open > 0
                ? `${imageJobsProbe.open} open · `
                : null}
              {(imageJobsProbe.queued ?? 0) > 0
                ? `${imageJobsProbe.queued} queued · `
                : null}
              {imageJobsProbe.total} Flux process-memory this instance
              {(imageJobsProbe.failed ?? 0) > 0 ||
              (imageJobsProbe.canceled ?? 0) > 0
                ? ` · ${imageJobsProbe.failed ?? 0} failed · ${imageJobsProbe.canceled ?? 0} canceled`
                : ""}{" "}
              —{" "}
              <Link
                href="/image"
                className="font-semibold text-[var(--mint)] underline-offset-2 hover:underline"
              >
                Image studio
              </Link>
              . Separate from video ledger · not multi-node.
            </div>
          ) : null}

          {/* Soft-launch freeTrial honesty — same contract as Create / SoftLaunchStrip */}
          {session && isFreePlan && !demo ? (
            <div
              className={`rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
                trialDone
                  ? "border-amber-400/35 bg-amber-400/[0.07] text-amber-50/95"
                  : "border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] text-[var(--fg-muted)]"
              }`}
            >
              {trialDone ? (
                <>
                  <span className="font-semibold text-amber-100">
                    Free Mini trial used
                  </span>
                  {" · "}
                  cookie has fewer than {perJob} credits for another live job.
                  Cached Lab demos stay free (0 cr).{" "}
                  <Link
                    href="/pricing"
                    className="font-semibold text-[var(--mint)] underline-offset-2 hover:underline"
                  >
                    Compare plans
                  </Link>{" "}
                  when you want more live clips — Stripe live stays off until
                  gates pass.
                </>
              ) : (
                <>
                  <span className="font-semibold text-[var(--mint)]">
                    Free Mini
                    {freeLive
                      ? ` · ${freeLive.resolution} · ${freeLive.durationSec}s`
                      : " · 480p · 5s"}
                  </span>
                  {" · "}
                  ~{clipsLeft ?? "—"} live clip
                  {(clipsLeft ?? 0) === 1 ? "" : "s"} left this period ·
                  on-player mark · raw download blocked until T6 bake.
                </>
              )}
            </div>
          ) : null}

          {session?.freeTrial &&
          (session.freeTrial.failedLiveRefundPolicy ||
            session.freeTrial.ledgerTimeoutRefund ||
            session.freeTrial.ledgerCancelRefund) ? (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-[var(--fg-muted)]"
              data-profile-refund-policy="honesty"
            >
              <span className="font-semibold text-white/80">
                Live fail refunds
              </span>
              {" · "}
              {session.freeTrial.failedLiveRefundPolicy === "when_confirmed" ||
              session.freeTrial.failedLiveRefunds
                ? "when confirmed"
                : "—"}
              {session.freeTrial.ledgerTimeoutRefund === "unconfirmed"
                ? " · TIMEOUT unconfirmed"
                : ""}
              {session.freeTrial.ledgerCancelRefund === "unconfirmed"
                ? " · cancel unconfirmed"
                : ""}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-4 text-center">
            <div className="rounded-xl bg-[var(--bg-soft)] py-3">
              <p className="text-lg font-bold text-[var(--mint)]">
                {displayCredits ?? "—"}
              </p>
              <p className="text-[10px] text-[var(--fg-dim)]">
                {auth.signedIn ? "durable cr." : "credits"}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--bg-soft)] py-3">
              <p
                className={`text-lg font-bold ${
                  trialDone && isFreePlan ? "text-amber-200" : ""
                }`}
              >
                {clipsLeft !== null ? clipsLeft : "—"}
              </p>
              <p className="text-[10px] text-[var(--fg-dim)]">
                {trialDone && isFreePlan ? "trial used" : "live clips left"}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--bg-soft)] py-3">
              <p className="text-lg font-bold">{clips}</p>
              <p className="text-[10px] text-[var(--fg-dim)]">in library</p>
            </div>
          </div>

          <p className="text-xs text-[var(--fg-muted)]">
            {auth.signedIn
              ? durableBackend === "supabase"
                ? "Postgres durable wallet is visible here. Live spend requires atomic reserve — cookie is not live-spend authority (R0)."
                : "Cookie is not live-spend authority (R0). Durable file ledger is shadow-only (single node) until T5 SQL + multi-node store; live still needs durable reserve or labeled cached demos."
              : demo
                ? "Server is in demo-cached mode — labeled Lab clips cost 0 credits. Configure FAL_KEY for live Seedance Mini."
                : freeLive
                  ? `Free live jobs use Seedance Mini at ${freeLive.resolution} ${freeLive.durationSec}s with an on-player mark. Paid plans use the 720p path and include commercial listings.`
                  : "Free live jobs use Seedance Mini at 480p with an on-player mark. Paid plans use the 720p path and include commercial listings."}
          </p>

          <div className="flex flex-col gap-2">
            <Link
              href={PROFILE_GENERATE_HREF}
              className="btn btn-primary w-full text-sm"
              data-profile-generate="remix"
            >
              Open Generate
            </Link>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              data-profile-suite="product-first"
            >
              <Link
                href="/create?mode=seller-pack"
                className="btn btn-ghost w-full text-sm"
              >
                Seller Starter Pack
              </Link>
              <Link href="/modules" className="btn btn-ghost w-full text-sm">
                Modules
              </Link>
              <Link href="/status" className="btn btn-ghost w-full text-sm">
                System status
              </Link>
              <Link
                href="/flow"
                className="btn btn-ghost w-full text-sm text-white/50"
                title="Preview media wall — not a live Seedance job"
              >
                Flow · Preview
              </Link>
            </div>
            {!auth.signedIn ? (
              <Link href="/login" className="btn btn-ghost w-full text-sm">
                Sign in · cross-device later
              </Link>
            ) : null}
            <Link href="/library" className="btn btn-ghost w-full text-sm">
              Open library · {clips} clip{clips === 1 ? "" : "s"}
            </Link>
            <Link href="/pricing" className="btn btn-ghost w-full text-sm">
              Manage plan
            </Link>
            <Link href="/settings" className="btn btn-ghost w-full text-sm">
              Settings
            </Link>
          </div>
        </div>
      </details>
    </div>
  );
}
