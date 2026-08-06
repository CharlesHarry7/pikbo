"use client";

/**
 * HF Product / Marketing Studio three-step pattern — toy seller vertical.
 * Pure presentation; parent owns state.
 * Mobile: compact horizontal first-run strip (Phase F 390px).
 * sm+: full cards with blurbs.
 */
export function SellerPackSteps({
  step,
  demoMode,
}: {
  /** 1 upload · 2 run · 3 deliver */
  step: 1 | 2 | 3;
  /** Public sessions fail closed to cached prototypes. */
  demoMode: boolean;
}) {
  const items = demoMode
    ? [
        {
          n: 1 as const,
          label: "Choose sample",
          blurb: "Pikbo Lab only · no product upload",
        },
        {
          n: 2 as const,
          label: "Preview formats",
          blurb: "3 archived prototypes · 0 credits",
        },
        {
          n: 3 as const,
          label: "Review",
          blurb: "Inspect format and limitations",
        },
      ]
    : [
        { n: 1 as const, label: "Upload", blurb: "One rights-owned toy photo" },
        {
          n: 2 as const,
          label: "Generate pack",
          blurb: "3 private clips · 10 credits each (30 total)",
        },
        {
          n: 3 as const,
          label: "Deliver",
          blurb: "Owner-only Library and download",
        },
      ];

  return (
    <>
      {/* Phase F 390px: one-row path, same semantics as Create first-run */}
      <ol
        className="flex items-center gap-1 border-b border-[var(--border)] pb-2 text-[10px] font-bold uppercase tracking-wide sm:hidden"
        aria-label="Launch Pack steps"
        data-seller-pack-steps="compact"
      >
        {items.map((it, i) => (
          <li key={it.n} className="flex flex-1 items-center gap-1">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] ${
                step >= it.n
                  ? "bg-[var(--neon-pink)] text-[var(--void)]"
                  : "bg-white/10 text-white/40"
              }`}
            >
              {step > it.n ? "✓" : it.n}
            </span>
            <span
              className={
                step >= it.n ? "text-[var(--fg)]" : "text-[var(--fg-dim)]"
              }
            >
              {it.label}
            </span>
            {i < items.length - 1 ? (
              <span
                className="mx-0.5 flex-1 border-t border-white/10"
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>

      <ol
        className="mt-5 hidden gap-2 sm:grid sm:grid-cols-3"
        data-seller-pack-steps="full"
      >
        {items.map((it) => {
          const active = step === it.n;
          const done = step > it.n;
          return (
            <li
              key={it.n}
              className={`relative rounded-xl border px-3 py-2.5 transition ${
                active
                  ? "border-[var(--neon-pink)]/50 bg-[var(--neon-pink)]/[0.12] shadow-[0_0_28px_rgba(255,78,205,0.1)]"
                  : done
                    ? "border-[var(--neon-pink)]/25 bg-[var(--neon-pink)]/[0.05]"
                    : "border-white/10 bg-black/20 opacity-75"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-black ${
                    active || done
                      ? "bg-[var(--neon-pink)] text-[var(--void)] shadow-[0_0_12px_rgba(255,78,205,0.35)]"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {done ? "✓" : it.n}
                </span>
                <span
                  className={`text-sm font-bold ${
                    active
                      ? "text-[var(--neon-pink)]"
                      : done
                        ? "text-white/90"
                        : "text-white/70"
                  }`}
                >
                  {it.label}
                </span>
                {active ? (
                  <span className="ml-auto rounded-full bg-[var(--neon-pink)]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--neon-pink)]">
                    Now
                  </span>
                ) : null}
              </div>
              <p className="mt-1 pl-8 text-[11px] leading-snug text-white/45">
                {it.blurb}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
