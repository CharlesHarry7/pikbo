"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  fal: boolean;
  stripe: boolean;
  mode?: "live-generate" | "demo-cached" | string;
};

/** Small pill: demo vs live generation backend */
export function StatusBadge() {
  const [h, setH] = useState<Health | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetch("/api/health")
        .then((r) => r.json())
        .then((d) => setH(d))
        .catch(() =>
          setH({ ok: false, fal: false, stripe: false, mode: "demo-cached" })
        );
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  if (!h) return null;

  const live = h.mode === "live-generate" || h.fal;

  return (
    <div className="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wide">
      <span
        className={`rounded-full px-2 py-0.5 ${
          live
            ? "bg-[var(--mint)]/15 text-[var(--mint)]"
            : "bg-white/10 text-[var(--fg-dim)]"
        }`}
      >
        {live ? "Live access ready" : "Cached demo"}
      </span>
      {h.stripe && (
        <span className="rounded-full bg-[var(--brand)]/15 px-2 py-0.5 text-[var(--brand)]">
          Stripe on
        </span>
      )}
    </div>
  );
}
