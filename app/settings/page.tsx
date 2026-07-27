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
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createRemixHref } from "@/lib/remixIntent";
import { SESSION_EVENT } from "@/lib/sessionEvents";

/** Settings chrome Generate — listing spin remix (ratio/duration/channel). */
const SETTINGS_GENERATE_HREF = createRemixHref("360-spin-showcase");

type SessionJobsProbe = {
  open: number;
  total: number;
  succeeded: number;
  failed: number;
  /** Process-memory canceled (abort / client DELETE) — not multi-node cloud */
  canceled: number;
};

type T6Probe = {
  status: string;
  freeLiveRawDownload?: string;
  reason?: string;
  fileBake?: boolean;
};

type ImageJobsProbe = {
  total: number;
  open: number;
  succeeded?: number;
  failed?: number;
  canceled?: number;
  timeoutMs?: number;
};

export default function SettingsPage() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [libCount, setLibCount] = useState(0);
  const [agingCount, setAgingCount] = useState(0);
  const [jobsProbe, setJobsProbe] = useState<SessionJobsProbe | null>(null);
  const [imageJobsProbe, setImageJobsProbe] = useState<ImageJobsProbe | null>(
    null
  );
  const [t6, setT6] = useState<T6Probe | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function refreshLocal() {
    const list = loadHistory();
    setLibCount(list.length);
    setAgingCount(list.filter((i) => remoteClipMayExpire(i)).length);
  }

  useEffect(() => {
    function refreshSession() {
      void fetchMe().then(setSession);
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
        const succeeded = Number(
          res.headers.get("X-Pikbo-Jobs-Succeeded") || "0"
        );
        const failed = Number(res.headers.get("X-Pikbo-Jobs-Failed") || "0");
        const canceled = Number(
          res.headers.get("X-Pikbo-Jobs-Canceled") || "0"
        );
        setJobsProbe({
          open: Number.isFinite(open) ? open : 0,
          total: Number.isFinite(total) ? total : 0,
          succeeded: Number.isFinite(succeeded) ? succeeded : 0,
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
        const succeeded = Number(
          res.headers.get("X-Pikbo-Image-Jobs-Succeeded") || "0"
        );
        const failed = Number(
          res.headers.get("X-Pikbo-Image-Jobs-Failed") || "0"
        );
        const canceled = Number(
          res.headers.get("X-Pikbo-Image-Jobs-Canceled") || "0"
        );
        const timeoutMs = Number(
          res.headers.get("X-Pikbo-Image-Job-Timeout-Ms") || "0"
        );
        setImageJobsProbe({
          total: Number.isFinite(total) ? total : 0,
          open: Number.isFinite(open) ? open : 0,
          succeeded: Number.isFinite(succeeded) ? succeeded : 0,
          failed: Number.isFinite(failed) ? failed : 0,
          canceled: Number.isFinite(canceled) ? canceled : 0,
          timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
        });
      } catch {
        setImageJobsProbe(null);
      }
    }

    async function refreshT6() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) {
          setT6(null);
          return;
        }
        const body = (await res.json()) as { t6?: T6Probe };
        setT6(body.t6 ?? null);
      } catch {
        setT6(null);
      }
    }

    function refresh() {
      refreshSession();
      refreshLocal();
      void refreshJobsProbe();
      void refreshImageJobsProbe();
      void refreshT6();
    }

    const t = window.setTimeout(refresh, 0);
    window.addEventListener(SESSION_EVENT, refresh);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(SESSION_EVENT, refresh);
    };
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

  const durableBackend = session?.durable?.backend ?? null;
  const durableAuth = session?.durable?.authority ?? null;
  const durableReserved =
    session?.durable && typeof session.durable.reservedCredits === "number"
      ? session.durable.reservedCredits
      : null;

  const t6DownloadLabel = (() => {
    if (!t6) return "probe pending · assume blocked until proven";
    const mode = t6.freeLiveRawDownload || t6.status;
    if (mode === "allowed" || t6.status === "ready") {
      return "allowed · operator asserted file bake ready";
    }
    if (mode === "bake_on_download" || t6.status === "worker_configured") {
      return "bake on download · worker configured (not raw)";
    }
    return "blocked · T6 file bake not proven (overlay ≠ file watermark)";
  })();

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg">
        <span className="chip">Settings</span>
        <h1 className="mt-3 text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Device data & session. Signed-in durable wallets use local file or
          Supabase Postgres when the T5 migration is applied. Soft-launch live
          Generate still debits the guest cookie.
        </p>
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          data-settings-path="product-first"
        >
          <Link
            href={SETTINGS_GENERATE_HREF}
            className="btn btn-primary !px-3 !py-1.5 text-xs"
            data-settings-generate="remix"
          >
            Generate
          </Link>
          <Link
            href="/create?mode=seller-pack"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
          >
            Seller Pack
          </Link>
          <FreeTrialCta
            path="/settings"
            variant="ghost"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
            hideClipsChip
          />
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
            <span className="text-[var(--fg-muted)]">Auth configured</span>
            <span className="text-right font-semibold">
              {session?.authConfigured ? "yes · Supabase keys" : "no · guest only"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Credits authority</span>
            <span className="text-right text-xs font-semibold leading-snug">
              cookie generate
              {session?.signedIn
                ? ` · durable ${durableBackend || "pending"} (${durableAuth || "shadow"})`
                : ""}
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
              {durableReserved !== null && durableReserved > 0
                ? ` · ${durableReserved} reserved`
                : ""}
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
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Live fail refunds</span>
            <span className="max-w-[58%] text-right text-xs font-semibold leading-snug">
              {session?.freeTrial?.failedLiveRefundPolicy === "when_confirmed" ||
              session?.freeTrial?.failedLiveRefunds
                ? "when confirmed"
                : "—"}
              {session?.freeTrial?.ledgerTimeoutRefund === "unconfirmed"
                ? " · TIMEOUT unconfirmed"
                : ""}
              {session?.freeTrial?.ledgerCancelRefund === "unconfirmed"
                ? " · cancel unconfirmed"
                : ""}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Free raw download</span>
            <span className="max-w-[58%] text-right text-xs font-semibold leading-snug text-amber-100/90">
              {t6DownloadLabel}
            </span>
          </div>
          {t6?.reason ? (
            <p className="text-[10px] leading-relaxed text-[var(--fg-dim)]">
              T6 · {t6.status}
              {t6.fileBake ? " · fileBake asserted" : ""} — {t6.reason}
            </p>
          ) : null}
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Session jobs</span>
            <span
              className="text-right text-xs font-semibold leading-snug"
              data-settings-jobs="video"
            >
              {jobsProbe
                ? `${jobsProbe.open} open · ${jobsProbe.total} total (process-memory)`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--fg-muted)]">Still image jobs</span>
            <span
              className="text-right text-xs font-semibold leading-snug"
              data-settings-jobs="image"
            >
              {imageJobsProbe
                ? `${imageJobsProbe.open} open · ${imageJobsProbe.total} total (process-memory · Flux)`
                : "—"}
            </span>
          </div>
          {imageJobsProbe ? (
            <p
              className="text-[10px] leading-relaxed text-[var(--fg-dim)]"
              data-settings-jobs-detail="image"
            >
              {imageJobsProbe.succeeded ?? 0} succeeded ·{" "}
              {imageJobsProbe.failed ?? 0} failed ·{" "}
              {imageJobsProbe.canceled ?? 0} canceled · HEAD /api/image sweeps
              TIMEOUT
              {imageJobsProbe.timeoutMs
                ? ` (~${Math.round(imageJobsProbe.timeoutMs / 1000)}s)`
                : ""}
              .{" "}
              <Link
                href="/image"
                className="text-[var(--mint)] underline-offset-2 hover:underline"
              >
                Still Studio
              </Link>{" "}
              retries mint a new key after fail; abort/cancel stays refund
              unconfirmed until confirmed.
            </p>
          ) : null}
          {jobsProbe && jobsProbe.total > 0 ? (
            <p
              className="text-[10px] leading-relaxed text-[var(--fg-dim)]"
              data-settings-jobs-detail="video"
            >
              {jobsProbe.succeeded} succeeded · {jobsProbe.failed} failed ·{" "}
              {jobsProbe.canceled} canceled · this server instance only —{" "}
              <Link
                href="/library"
                className="text-[var(--mint)] underline-offset-2 hover:underline"
              >
                Library recovery
              </Link>
              . Not multi-node cloud. Abort marks ledger canceled; soft-launch
              fal may still finish server-side.
            </p>
          ) : null}
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
            server. Paid needs durable entitlements + Stripe test keys (live off).
            Free Mini trial state comes from{" "}
            <code className="text-[var(--fg-muted)]">GET /api/me</code>{" "}
            freeTrial — not a client guess. T6 from{" "}
            <code className="text-[var(--fg-muted)]">health.t6</code>.
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
            onClick={() => {
              // OnboardingBanner uses pikbo_onboard_v3
              try {
                localStorage.removeItem("pikbo_onboard_v3");
                localStorage.removeItem("pikbo_onboard_v1");
                setMsg("Reset onboarding banner");
              } catch {
                setMsg("Could not clear");
              }
            }}
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
