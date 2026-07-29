"use client";

/**
 * HF-class Generate wait surface — shared by CreateStudio + LandingToolPanel.
 * Eligible Live work can take minutes; progress is paced, not a fake 30s bar.
 * No invented ETAs as hard promises — only phase labels + elapsed.
 *
 * Long wait / inconclusive durable recovery:
 * - Keep the original /api/generate open (no auto-abort, no second generate).
 * - "Open Library · keep generating" detaches UI only — never cancels ledger.
 * - "Cancel generation" is the only path that aborts + best-effort ledger cancel.
 */

export type WaitPhaseId =
  | "demo"
  | "upload"
  | "queue"
  | "render"
  | "deep"
  | "long";

export function waitPhaseForElapsed(
  elapsed: number,
  demoMode: boolean
): {
  id: WaitPhaseId;
  title: string;
  detail: string;
  /** 0–2 for step rail */
  step: 0 | 1 | 2;
} {
  if (demoMode) {
    return {
      id: "demo",
      title: "Loading Lab sample",
      detail: "Cached example — not from your upload",
      step: 2,
    };
  }
  if (elapsed < 4) {
    return {
      id: "upload",
      title: "Sending reference",
      detail: "Photo secured · starting job",
      step: 0,
    };
  }
  if (elapsed < 22) {
    return {
      id: "queue",
      title: "In Seedance queue",
      detail: "Provider accepted · waiting for a worker",
      step: 1,
    };
  }
  if (elapsed < 70) {
    return {
      id: "render",
      title: "Rendering motion",
      detail: "Eligible Live jobs can take minutes — keep this tab open",
      step: 2,
    };
  }
  if (elapsed < 140) {
    return {
      id: "deep",
      title: "Still rendering",
      detail: "Longer clips take longer — you can leave this page open",
      step: 2,
    };
  }
  return {
    id: "long",
    title: "Still working",
    detail: "Original request is still running · cancel only if you mean it",
    step: 2,
  };
}

/** Pace the bar for a multi-minute provider job (not a hard ETA). */
export function waitProgressPct(elapsed: number, demoMode: boolean): number {
  if (demoMode) return Math.min(92, 20 + elapsed * 8);
  return Math.min(96, 5 + elapsed * 0.52);
}

const STEPS = ["Send", "Queue", "Render"] as const;

export function GenerateWaitStage({
  elapsed,
  demoMode = false,
  image,
  effectLabel,
  onCancel,
  onLeaveToLibrary,
  recoveryChecking = false,
  awaitingPrimary = false,
  compact = false,
  className = "",
}: {
  elapsed: number;
  demoMode?: boolean;
  /** Optional still under the spinner — grounds the wait in the user’s toy */
  image?: string | null;
  effectLabel?: string | null;
  /** Explicit cancel — aborts browser request + best-effort ledger cancel. */
  onCancel?: () => void;
  /**
   * Non-destructive leave: stop waiting here / open Library.
   * Must NOT abort primary or cancel the ledger.
   */
  onLeaveToLibrary?: () => void;
  /** The original POST is slow; read the same owner-only durable task. */
  recoveryChecking?: boolean;
  /**
   * Durable recovery finished without authority; original /api/generate is
   * still the only in-flight path.
   */
  awaitingPrimary?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const phase = waitPhaseForElapsed(elapsed, demoMode);
  const pct = waitProgressPct(elapsed, demoMode);
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const clock = mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${ss}s`;
  const longWait = !demoMode && (awaitingPrimary || elapsed >= 90);
  /** Detach only after recovery is inconclusive or the wait is already long. */
  const showLeaveToLibrary =
    Boolean(onLeaveToLibrary) && !demoMode && longWait;
  const title = awaitingPrimary
    ? "Waiting on original render"
    : recoveryChecking
      ? "Tracking private task"
      : phase.title;
  const detail = awaitingPrimary
    ? "Saved recovery has no final answer yet. The first request is still running — no second provider call or charge."
    : recoveryChecking
      ? "Same private task · no second provider call or charge"
      : phase.detail;

  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center text-center ${
        compact ? "p-5" : "p-7 sm:p-10"
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-awaiting-primary={awaitingPrimary ? "true" : "false"}
      data-long-wait={longWait ? "true" : "false"}
    >
      {/* Soft stage glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(200,255,61,0.12), transparent 70%)",
        }}
      />

      {image ? (
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            width={compact ? 64 : 88}
            height={compact ? 64 : 88}
            className={`rounded-2xl object-cover ring-2 ring-[var(--mint)]/40 shadow-[0_0_32px_rgba(200,255,61,0.2)] ${
              compact ? "h-16 w-16" : "h-[5.5rem] w-[5.5rem]"
            }`}
          />
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--mint)] text-[10px] font-black text-black shadow-[0_0_12px_rgba(200,255,61,0.5)]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          </span>
        </div>
      ) : (
        <div
          className={`mx-auto mb-4 animate-spin rounded-full border-2 border-white/15 border-t-[var(--mint)] ${
            compact ? "h-9 w-9" : "h-11 w-11"
          }`}
        />
      )}

      <p
        className={`relative font-black tracking-tight text-white ${
          compact ? "text-sm" : "text-base sm:text-lg"
        }`}
      >
        {title}
      </p>
      {effectLabel ? (
        <p className="relative mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mint)]/90">
          {effectLabel}
        </p>
      ) : null}
      <p
        className={`relative mt-1 max-w-xs leading-relaxed text-white/50 ${
          compact ? "text-[11px]" : "text-xs sm:text-[13px]"
        }`}
      >
        {detail}
      </p>

      {/* Step rail — HF job stages */}
      <div className="relative mt-4 flex items-center gap-1.5">
        {STEPS.map((label, i) => {
          const done = i < phase.step;
          const on = i === phase.step;
          return (
            <div key={label} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span
                  className={`h-px w-4 sm:w-6 ${
                    done || on ? "bg-[var(--mint)]/50" : "bg-white/15"
                  }`}
                />
              ) : null}
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                  on
                    ? "bg-[var(--mint)] text-black"
                    : done
                      ? "border border-[var(--mint)]/40 text-[var(--mint)]"
                      : "border border-white/10 text-white/35"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className={`relative mx-auto mt-4 overflow-hidden rounded-full bg-white/10 ${
          compact ? "h-1.5 w-44" : "h-2 w-52 sm:w-64"
        }`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: "var(--grad, linear-gradient(90deg,#c8ff3d,#7dffb3))",
          }}
        />
      </div>

      <p className="relative mt-2 font-mono text-[11px] font-bold tabular-nums text-white/55">
        {clock}
        {!demoMode ? (
          <span className="ml-1.5 font-sans text-[10px] font-medium text-white/35">
            · typical Mini 1–3 min
          </span>
        ) : null}
      </p>

      {!demoMode && recoveryChecking && !awaitingPrimary ? (
        <p className="relative mt-2 max-w-xs rounded-lg border border-[var(--mint)]/25 bg-[var(--mint)]/[0.07] px-3 py-1.5 text-[10px] leading-snug text-white/80">
          Pikbo is following the same durable attempt. If the first response
          stays open after saving, the owner result will recover here.
        </p>
      ) : !demoMode && awaitingPrimary ? (
        <p className="relative mt-2 max-w-xs rounded-lg border border-[var(--mint)]/25 bg-[var(--mint)]/[0.07] px-3 py-1.5 text-[10px] leading-snug text-white/80">
          Recovery did not end this job. Your original generate is still live —
          leave for Library without canceling, or cancel only if you intend to
          stop this attempt.
        </p>
      ) : !demoMode && elapsed >= 90 ? (
        <p className="relative mt-2 max-w-xs rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1.5 text-[10px] leading-snug text-amber-100/90">
          Still working past 90s is normal for Mini. You can open Library while
          this request keeps running — cancel only if you mean to stop it.
        </p>
      ) : null}

      {showLeaveToLibrary || onCancel ? (
        <div className="relative mt-4 flex w-full max-w-xs flex-col items-center gap-2">
          {showLeaveToLibrary ? (
            <>
              <button
                type="button"
                onClick={onLeaveToLibrary}
                data-generate-leave="detach"
                className="w-full rounded-full border border-[var(--mint)]/40 bg-[var(--mint)]/15 px-4 py-2 text-[11px] font-bold text-[var(--mint)] transition hover:border-[var(--mint)]/70 hover:bg-[var(--mint)]/25"
                title="Stop waiting on this page. Does not abort the original generate or cancel the ledger."
              >
                Open Library · keep generating
              </button>
              <p className="max-w-[18rem] text-[10px] leading-relaxed text-white/40">
                Leaves this wait screen only. No cancel, no second charge — check
                Library when the private result is ready.
              </p>
            </>
          ) : null}
          {onCancel ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                data-generate-leave="cancel"
                className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur transition hover:border-white/40 hover:text-white"
                title="Aborts this browser request and best-effort cancels the local ledger. Soft-launch may still finish server-side; refund unconfirmed until balance confirms."
              >
                Cancel generation · {elapsed}s
              </button>
              <p className="max-w-[16rem] text-[10px] leading-relaxed text-white/35">
                Explicit cancel only. Live debit/refund may still settle
                server-side — check balance before retry.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Compact strip for sticky mobile CTA while generating. */
export function GenerateWaitMobileStrip({
  elapsed,
  demoMode = false,
  onCancel,
  onLeaveToLibrary,
  awaitingPrimary = false,
}: {
  elapsed: number;
  demoMode?: boolean;
  onCancel: () => void;
  onLeaveToLibrary?: () => void;
  awaitingPrimary?: boolean;
}) {
  const phase = waitPhaseForElapsed(elapsed, demoMode);
  const pct = waitProgressPct(elapsed, demoMode);
  const showLeaveToLibrary =
    Boolean(onLeaveToLibrary) &&
    !demoMode &&
    (awaitingPrimary || elapsed >= 90);
  const title = awaitingPrimary
    ? "Original render still running"
    : phase.title;

  return (
    <div className="w-full" data-awaiting-primary={awaitingPrimary ? "true" : "false"}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-bold text-white/70">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--mint)]" />
          {title}
          <span className="ml-1 font-mono text-white/45">· {elapsed}s</span>
        </p>
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-white/35">
          {awaitingPrimary ? "No second job" : "Keep tab open"}
        </span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "var(--grad, #c8ff3d)",
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {showLeaveToLibrary ? (
          <button
            type="button"
            onClick={onLeaveToLibrary}
            data-generate-leave="detach"
            className="btn w-full border border-[var(--mint)]/40 bg-[var(--mint)]/10 py-2.5 text-sm text-[var(--mint)]"
          >
            Open Library · keep generating
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          data-generate-leave="cancel"
          className="btn btn-ghost w-full border border-white/20 py-2.5 text-sm text-white/85"
        >
          Cancel generation · {elapsed}s
        </button>
      </div>
    </div>
  );
}
