import Link from "next/link";
import { PLANS, CREDITS_PER_VIDEO, clipsFromCredits } from "@/lib/pricing";

/** Compact upgrade CTA used when credits run out. */
export function PaywallCard({
  title = "Out of credits",
  subtitle = "Your current allowance is used up. Creator adds about five live jobs at today's flat rate, without the on-player mark.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const free = PLANS.find((p) => p.id === "free")!;
  const creator = PLANS.find((p) => p.id === "creator")!;

  return (
    <div className="rounded-xl border border-[var(--brand)]/40 bg-[var(--grad-soft)] p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">
        {subtitle}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/60 p-2.5">
          <p className="text-[10px] font-bold uppercase text-[var(--fg-dim)]">
            Free
          </p>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            {free.credits} credits · ~{clipsFromCredits(free.credits)} trial clip
          </p>
          <p className="text-[10px] text-[var(--fg-dim)]">
            {free.resolution} · on-player mark
          </p>
        </div>
        <div className="rounded-lg border border-[var(--brand)]/50 bg-[var(--card)] p-2.5">
          <p className="text-[10px] font-bold uppercase text-[var(--mint)]">
            Creator · ${creator.priceMonthly}/mo
          </p>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            {creator.credits} credits · ~{clipsFromCredits(creator.credits)}{" "}
            clips
          </p>
          <p className="text-[10px] text-[var(--fg-dim)]">
            {creator.resolution} · no player mark · commercial
          </p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[var(--fg-dim)]">
        Each eligible live job currently costs {CREDITS_PER_VIDEO} credits.
        Failed live jobs restore credits when confirmed; cached examples use no credits.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/pricing" className="btn btn-primary px-4 py-2 text-xs">
          See plans & checkout
        </Link>
        <Link href="/library" className="btn btn-ghost px-4 py-2 text-xs">
          Library
        </Link>
      </div>
    </div>
  );
}
