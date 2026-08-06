"use client";

import Link from "next/link";
import {
  listCreateShelfWorkflows,
  type Workflow,
  type WorkflowId,
} from "@/lib/workflows";
import { track } from "@/lib/analytics";

/**
 * Yiha /lego + HF Apps pattern: dense mini-app shelf on Create.
 * Each card is a prefilled job path — no fake providers.
 */
export function WorkflowShelf({
  activeId,
  onPick,
  compact,
}: {
  /** Highlight when current Create job matches a workflow.jobId */
  activeId?: string | null;
  /** Client pick for same-page workflows (no full navigation) */
  onPick?: (workflow: Workflow) => void;
  compact?: boolean;
}) {
  const items = listCreateShelfWorkflows();

  return (
    <div
      className={`border-b border-white/10 bg-gradient-to-b from-[var(--mint)]/[0.08] via-black/40 to-transparent ${
        compact ? "px-3 py-2" : "px-4 py-3.5"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]/90">
              Modules · toy blocks
            </p>
            {!compact && (
              <p className="mt-0.5 text-[11px] text-white/45">
                Modular jobs (suite mini-apps pattern) · one photo · Seedance engine
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/modules"
              className="text-[10px] font-semibold text-[var(--mint)] hover:underline"
            >
              All modules →
            </Link>
            <Link
              href="/flow"
              className="text-[10px] font-semibold text-white/35 hover:text-white/65 hover:underline"
              title="Preview media wall — not a live Seedance job"
            >
              Flow · Preview
            </Link>
          </div>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {items.map((w) => {
            const active =
              activeId === w.id ||
              (w.jobId != null && activeId === w.jobId);
            const useClientPick =
              Boolean(onPick) &&
              w.live &&
              w.href.startsWith("/create") &&
              w.id !== "photo-to-clip";

            if (useClientPick && onPick) {
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    track({
                      event: "recipe_use",
                      path: "/create",
                      recipe: w.effect,
                      meta: { workflow: w.id, surface: "shelf" },
                    });
                    onPick(w);
                  }}
                  className={`min-w-[8.75rem] max-w-[11rem] shrink-0 rounded-2xl border px-3 py-2.5 text-left transition duration-200 ${
                    active
                      ? "border-[var(--neon-pink)] bg-[var(--neon-pink)]/15 shadow-[0_0_28px_rgba(255,78,205,0.15)]"
                      : "border-white/12 bg-black/40 hover:border-white/28 hover:bg-black/55"
                  }`}
                >
                  <WorkflowCardBody workflow={w} active={active} />
                </button>
              );
            }

            return (
              <Link
                key={w.id}
                href={w.href}
                onClick={() =>
                  track({
                    event: "recipe_use",
                    path: "/create",
                    recipe: w.effect,
                    meta: { workflow: w.id, surface: "shelf_link" },
                  })
                }
                className={`min-w-[8.75rem] max-w-[11rem] shrink-0 rounded-2xl border px-3 py-2.5 text-left transition duration-200 ${
                  active
                    ? "border-[var(--neon-pink)] bg-[var(--neon-pink)]/15 shadow-[0_0_28px_rgba(255,78,205,0.15)]"
                    : "border-white/12 bg-black/40 hover:border-white/28 hover:bg-black/55"
                }`}
              >
                <WorkflowCardBody workflow={w} active={active} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkflowCardBody({
  workflow: w,
  active,
}: {
  workflow: Workflow;
  active: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none" aria-hidden>
          {w.emoji}
        </span>
        {w.badge && (
          <span
            className={`rounded-full px-1.5 py-px text-[8px] font-black uppercase tracking-wide ${
              active
                ? "bg-[var(--neon-pink)] text-[var(--void)]"
                : "bg-white/10 text-white/60"
            }`}
          >
            {w.badge}
          </span>
        )}
      </div>
      <span
        className={`mt-1.5 block text-[11px] font-bold leading-tight ${
          active ? "text-[var(--neon-pink)]" : "text-white/90"
        }`}
      >
        {w.label}
      </span>
      <span className="mt-0.5 block text-[10px] leading-snug text-white/45">
        {w.blurb}
      </span>
    </>
  );
}

export type { WorkflowId };
