import Link from "next/link";

/** Honest validation gate used when private access or allowance is unavailable. */
export function PaywallCard({
  title = "Private beta allowance unavailable",
  subtitle = "Founding Studio remains closed while Pikbo validates the single-Moment workflow, recovery, privacy, and real retry cost.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--brand)]/40 bg-[var(--grad-soft)] p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">
        {subtitle}
      </p>
      <div className="mt-3 rounded-lg border border-[var(--brand)]/45 bg-[var(--card)] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mint)]">
          Founding Studio · coming soon
        </p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          No public price, monthly allowance, subscription, or checkout is available.
          Pikbo Lab samples remain cached and use no visitor product photo.
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/pricing" className="btn btn-primary px-4 py-2 text-xs">
          See the validation gate
        </Link>
        <Link href="/library" className="btn btn-ghost px-4 py-2 text-xs">
          Library
        </Link>
      </div>
    </div>
  );
}
