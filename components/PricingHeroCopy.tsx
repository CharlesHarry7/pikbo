import type { ReactNode } from "react";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createRemixHref } from "@/lib/remixIntent";

export type PricingCopyVariant = "outcome" | "cost-control";

const COPY: Record<
  PricingCopyVariant,
  {
    badge: string;
    eyebrow: string;
    title: ReactNode;
    description: string;
    primary: string;
    secondary: string;
  }
> = {
  outcome: {
    badge: "Start with one owned-toy photo",
    eyebrow: "For collectors, toy sellers, and small shops",
    title: (
      <>
        Pikbo pricing for toy sellers.
        <br />
        <span className="text-grad">Choose capacity for launch-ready clips.</span>
      </>
    ),
    description:
      "Reuse the product photos you already have instead of setting up a new shoot for every listing or drop. Preview the three formats now; private-beta accounts see the full quote before generation.",
    primary: "Animate one SKU",
    secondary: "See Founding Studio",
  },
  "cost-control": {
    badge: "Finite credits · visible limits",
    eyebrow: "Plan content before you spend",
    title: (
      <>
        Know how many product clips
        <br />
        <span className="text-grad">your plan can produce.</span>
      </>
    ),
    description:
      "The Founding Studio candidate includes three Launch Packs per month: nine fixed 5-second 720p outputs. Subscriptions open after the private beta proves quality, recovery, and sustainable cost.",
    primary: "Build my first clip",
    secondary: "Compare allowances",
  },
};

export function PricingHeroCopy({
  variant,
}: {
  variant: PricingCopyVariant;
}) {
  const copy = COPY[variant];

  return (
    <section
      className="glow-bg overflow-hidden border-b border-[var(--border)]"
      data-pricing-copy-variant={variant}
    >
      <div className="container-x relative z-10 py-14 text-center sm:py-20">
        <Badge variant="live" className="mx-auto normal-case tracking-wider">
          {copy.badge}
        </Badge>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--fg-dim)]">
          {copy.eyebrow}
        </p>
        <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--fg-muted)] sm:text-lg">
          {copy.description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <FreeTrialCta
            path="/pricing"
            variant="mint"
            labelTry={copy.primary}
            labelPlans="Compare plans"
            labelDemo="Try Lab sample"
            className="!px-6 !py-3 text-sm font-black"
          />
          <Button asChild size="lg" variant="secondary">
            <Link
              href={createRemixHref(
                "360-spin-showcase",
                `pricing-${variant}`
              )}
              data-pricing-studio="generate-remix"
            >
              Full studio
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="#plans">{copy.secondary}</Link>
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/library"
            className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/55 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
          >
            Library
          </Link>
          <Link
            href="/create?mode=seller-pack"
            className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/55 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
          >
            Launch Pack
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[var(--fg-dim)]">
          <span>✓ Preview examples use no credits</span>
          <span>✓ Confirmed failed jobs restore their credit charge</span>
          <span>✓ Commercial use is scoped to Founding Studio</span>
          <span>✓ Founding Studio opens after private beta</span>
        </div>
      </div>
    </section>
  );
}
