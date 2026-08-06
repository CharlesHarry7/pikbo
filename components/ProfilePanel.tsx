"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadHistory } from "@/lib/history";
import {
  canLiveGenerate,
  fetchMe,
  freeTrialExhausted,
  isDemoMode,
  type MeResponse,
} from "@/lib/meClient";
import {
  isClientTimeoutError,
  STUDIO_SESSION_BOOT_MS,
} from "@/lib/clientTimeout";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { createGenerate360Href } from "@/lib/jobIntents";
import { SESSION_EVENT } from "@/lib/sessionEvents";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type SessionBoot = "checking" | "ready" | "timeout";

const PROFILE_GENERATE_HREF = createGenerate360Href("profile-panel");

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
  /** Finite shell boot — never permanent hang on access/balance chrome. */
  const [sessionBoot, setSessionBoot] = useState<SessionBoot>("checking");
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

  const refreshSession = useCallback(() => {
    setSessionBoot("checking");
    setClips(loadHistory().length);
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS })
      .then((d) => {
        setSession(d);
        setSessionBoot("ready");
      })
      .catch((err) => {
        // 8s Studio open honesty: fail closed — no invented balance/access.
        setSession(null);
        setSessionBoot(isClientTimeoutError(err) ? "timeout" : "ready");
      });
  }, []);

  useEffect(() => {
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
      refreshSession();
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
  }, [refreshSession]);

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
  const displayCredits =
    auth.signedIn && durableAvailable !== null
      ? durableAvailable
      : session?.credits;
  const trialDone = freeTrialExhausted(session);
  const freeLive = session?.freeTrial?.freeLive;
  /** R0/T6: Free Mini product-cap lines only when Live is actually open. */
  const freeLiveOpen = Boolean(
    canLiveGenerate(session) &&
      freeLive &&
      freeLive.liveEnabled !== false
  );
  const freeLiveModelLabel =
    freeLive?.modelClass === "seedance-fast" ? "Private Fast" : "Free Mini";
  const clipsLeft =
    typeof session?.freeTrial?.clipsLeft === "number"
      ? session.freeTrial.clipsLeft
      : displayCredits !== undefined && displayCredits !== null
        ? Math.floor(Number(displayCredits) / perJob)
        : null;
  const isFreePlan =
    session?.freeTrial?.isFreePlan === true || session?.plan === "free";

  const accountLine =
    sessionBoot === "checking"
      ? "Checking access…"
      : sessionBoot === "timeout"
        ? "Access check timed out · balance unknown"
        : !auth.signedIn
          ? "Guest mode · saved on this device"
          : durableBackend
            ? "Signed in · balance and completed private results available across devices"
            : "Signed in · loading account details";

  const studioLabel =
    sessionBoot === "checking"
      ? "Checking studio…"
      : sessionBoot === "timeout"
        ? "Lab studio · access unknown"
        : auth.signedIn
          ? auth.email || "Signed-in studio"
          : session
            ? `${session.planName} studio`
            : "Guest studio";

  return (
    <div
      className="card mt-8 space-y-4 p-6"
      data-profile-boot={sessionBoot}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-xl"
          style={{ background: "var(--grad)" }}
        >
          🧸
        </div>
        <div>
          <p className="font-semibold">{studioLabel}</p>
          <p className="text-xs text-[var(--fg-dim)]">
            {accountLine}
            {demo && sessionBoot === "ready" ? " · cached previews are free" : ""}
          </p>
        </div>
      </div>

      {sessionBoot === "timeout" ? (
        <div
          className="rounded-xl border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]"
          data-profile-boot-error="session-timeout"
        >
          <span className="font-semibold text-white/90">
            Could not verify access in time.
          </span>{" "}
          Balance and plan stay unknown — we will not invent credits or guest
          Lab claims until you retry.
          <div className="mt-2">
            <button
              type="button"
              onClick={() => refreshSession()}
              data-profile-boot-retry
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/15 px-3 text-xs font-bold text-[var(--mint)] transition hover:bg-[var(--mint)]/25"
            >
              Retry access check
            </button>
          </div>
        </div>
      ) : null}

      {sessionBoot === "checking" ? (
        <p
          className="text-[11px] text-[var(--fg-dim)]"
          data-profile-boot-status="checking"
        >
          Verifying private access and balance — finishes within a few seconds.
        </p>
      ) : null}

      {auth.signedIn && auth.migratedNote ? (
        <p className="rounded-xl border border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[var(--fg-muted)]">
          {auth.migratedNote}
        </p>
      ) : null}

      {jobsProbe && (jobsProbe.open > 0 || jobsProbe.total > 0) ? (
        <div
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]"
          data-profile-jobs="video"
        >
          <span className="font-semibold text-white/80">Video jobs</span>
          {" · "}
          {jobsProbe.open > 0
            ? `${jobsProbe.open} in progress · `
            : null}
          {jobsProbe.total} total
          {(jobsProbe.failed ?? 0) > 0 || (jobsProbe.canceled ?? 0) > 0
            ? ` · ${(jobsProbe.failed ?? 0) + (jobsProbe.canceled ?? 0)} need attention`
            : ""}{" "}
          —{" "}
          <Link
            href="/library"
            className="font-semibold text-[var(--mint)] underline-offset-2 hover:underline"
          >
            Open Library
          </Link>
          .
        </div>
      ) : null}

      {imageJobsProbe &&
      (imageJobsProbe.open > 0 || imageJobsProbe.total > 0) ? (
        <div
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]"
          data-profile-jobs="image"
        >
          <span className="font-semibold text-white/80">Still image jobs</span>
          {" · "}
          {imageJobsProbe.open > 0
            ? `${imageJobsProbe.open} open · `
            : null}
          {(imageJobsProbe.queued ?? 0) > 0
            ? `${imageJobsProbe.queued} queued · `
            : null}
          {imageJobsProbe.total} total
          {(imageJobsProbe.failed ?? 0) > 0 ||
          (imageJobsProbe.canceled ?? 0) > 0
            ? ` · ${(imageJobsProbe.failed ?? 0) + (imageJobsProbe.canceled ?? 0)} need attention`
            : ""}{" "}
          —{" "}
          <Link
            href="/image"
            className="font-semibold text-[var(--mint)] underline-offset-2 hover:underline"
          >
            Image studio
          </Link>
          .
        </div>
      ) : null}

      {/* Soft-launch freeTrial honesty — Free Mini only when freeLiveOpen */}
      {session && isFreePlan && freeLiveOpen ? (
        <div
          className={`rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
            trialDone
              ? "border-amber-400/35 bg-amber-400/[0.07] text-amber-50/95"
              : "border-[var(--mint)]/25 bg-[var(--mint)]/[0.06] text-[var(--fg-muted)]"
          }`}
          data-profile-free-live="open"
        >
          {trialDone ? (
            <>
              <span className="font-semibold text-amber-100">
                This trial is used
              </span>
              {" · "}
              Cached Lab previews remain free.{" "}
              <Link
                href="/pricing"
                className="font-semibold text-[var(--mint)] underline-offset-2 hover:underline"
              >
                Compare plans
              </Link>{" "}
              for more real clips.
            </>
          ) : (
            <>
              <span className="font-semibold text-[var(--mint)]">
                {freeLiveModelLabel}
                {freeLive
                  ? ` · ${freeLive.resolution} · ${freeLive.durationSec}s`
                  : " · 480p · 5s"}
              </span>
              {" · "}
              ~{clipsLeft ?? "—"} live clip
              {(clipsLeft ?? 0) === 1 ? "" : "s"} available · finished clips
              are saved privately in Library.
            </>
          )}
        </div>
      ) : null}
      {session && isFreePlan && !freeLiveOpen ? (
        <div
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--fg-muted)]"
          data-profile-free-live="gated"
        >
          <span className="font-semibold text-white/80">Live gated</span>
          {" · "}
          Cached Lab previews remain free (0 credits · upload not processed).
          Real generation opens for eligible invited accounts when Live is
          enabled.
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
          <span className="font-semibold text-white/80">Interrupted jobs</span>
          {" · check your balance before retrying"}
          {session.freeTrial.ledgerTimeoutRefund === "unconfirmed"
            ? " · timed-out jobs may still be processing"
            : ""}
          {session.freeTrial.ledgerCancelRefund === "unconfirmed"
            ? " · canceled jobs are reviewed before credits return"
            : ""}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-4 text-center">
        <div className="rounded-xl bg-[var(--bg-soft)] py-3">
          <p className="text-lg font-bold text-[var(--mint)]">
            {sessionBoot === "ready" ? (displayCredits ?? "—") : "—"}
          </p>
          <p className="text-[10px] text-[var(--fg-dim)]">
            {sessionBoot !== "ready"
              ? "credits unknown"
              : auth.signedIn
                ? "account credits"
                : "credits"}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--bg-soft)] py-3">
          <p
            className={`text-lg font-bold ${
              trialDone && isFreePlan && freeLiveOpen ? "text-amber-200" : ""
            }`}
          >
            {sessionBoot === "ready" && freeLiveOpen && clipsLeft !== null
              ? clipsLeft
              : "—"}
          </p>
          <p className="text-[10px] text-[var(--fg-dim)]">
            {sessionBoot !== "ready"
              ? "access unknown"
              : freeLiveOpen
                ? trialDone && isFreePlan
                  ? "trial used"
                  : "live clips left"
                : "live gated"}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--bg-soft)] py-3">
          <p className="text-lg font-bold">{clips}</p>
          <p className="text-[10px] text-[var(--fg-dim)]">in library</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" data-profile-path="product-first">
        <Link
          href={PROFILE_GENERATE_HREF}
          className="btn btn-primary px-3 py-1.5 text-xs"
          data-profile-generate="remix"
        >
          Generate
        </Link>
        <Link href="/library" className="btn btn-ghost px-3 py-1.5 text-xs">
          Library · {clips}
        </Link>
        <Link
          href="/create?effect=street-power-up&source=profile-panel"
          className="btn btn-ghost px-3 py-1.5 text-xs"
        >
          Create one Moment
        </Link>
        {!auth.signedIn ? (
          <Link href="/login" className="btn btn-ghost px-3 py-1.5 text-xs">
            Sign in
          </Link>
        ) : null}
      </div>

      <p className="text-xs text-[var(--fg-muted)]">
        {auth.signedIn
          ? "Your balance and completed private results are available across devices; local history stays in this browser."
          : demo || !freeLiveOpen
            ? "Cached Lab previews cost 0 credits and do not process your upload."
            : freeLive
              ? `${freeLiveModelLabel} creates private ${freeLive.resolution}, ${freeLive.durationSec}-second clips for eligible accounts.`
              : "Sign in to see whether real generation is available for your account."}
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
          className="grid grid-cols-2 gap-2"
          data-profile-suite="product-first"
        >
          <Link
            href="/create?effect=street-power-up&source=profile-panel"
            className="btn btn-ghost w-full text-sm"
          >
            Create one Moment
          </Link>
          <Link href="/library" className="btn btn-ghost w-full text-sm">
            Library
          </Link>
        </div>
        {!auth.signedIn ? (
          <Link href="/login" className="btn btn-ghost w-full text-sm">
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="btn btn-ghost w-full text-sm disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        )}
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
  );
}
