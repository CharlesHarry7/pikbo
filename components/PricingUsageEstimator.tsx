"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FOUNDING_STUDIO_PACKS,
  PAID_PLAN_ID,
  getPlan,
} from "@/lib/pricing";
import { SELLER_PACK_LIVE_TOTAL_CREDITS } from "@/lib/sellerPackContract";

export function PricingUsageEstimator() {
  const [packs, setPacks] = useState<number>(FOUNDING_STUDIO_PACKS);
  const plan = getPlan(PAID_PLAN_ID);
  const outputs = packs * 3;
  const credits = packs * SELLER_PACK_LIVE_TOTAL_CREDITS;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#111016] shadow-[0_30px_80px_-45px_rgba(255,78,205,.45)]">
      <div className="grid lg:grid-cols-[1.25fr_.75fr]">
        <div className="p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--mint)]">
            Launch Pack planner
          </p>
          <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold">
                How many SKUs will you launch this month?
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--fg-muted)]">
                One Pack turns one owned product photo into three fixed 5-second
                formats. The full three-format Pack uses 30 credits.
              </p>
            </div>
            <p className="text-4xl font-black text-white">
              {packs}
              <span className="ml-2 text-sm font-medium text-[var(--fg-dim)]">
                Packs
              </span>
            </p>
          </div>

          <input
            aria-label="Monthly Launch Pack estimate"
            type="range"
            min="1"
            max={FOUNDING_STUDIO_PACKS}
            step="1"
            value={packs}
            onChange={(event) => setPacks(Number(event.target.value))}
            className="mt-8 h-2 w-full cursor-pointer accent-[var(--brand)]"
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--fg-dim)]">
            <span>1 SKU</span>
            <span>{FOUNDING_STUDIO_PACKS} SKUs included</span>
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(110,231,199,.16),transparent_55%)] p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fg-dim)]">
              Fixed output
            </p>
            <h3 className="mt-3 text-3xl font-black">
              {outputs} private videos
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--fg-muted)]">
              {credits} credits · Listing Spin 1:1 · Blind-box Reveal 9:16 ·
              Social Flash 9:16. A confirmed failed format restores its 10
              credits after the failure is confirmed.
            </p>
          </div>
          <Link
            href={`#plan-${plan.id}`}
            className="btn btn-primary mt-6 w-full text-sm"
          >
            See {plan.name} details ↓
          </Link>
        </div>
      </div>
    </section>
  );
}
