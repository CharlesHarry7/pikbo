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
        Turn one toy photo into
        <br />
        <span className="text-grad">a listing-ready product clip.</span>
      </>
    ),
    description:
      "Reuse the product photos you already have instead of setting up a new shoot for every listing or drop. Start with one 5-second Mini trial; paid plans add finite commercial-use credits.",
    primary: "Animate one SKU",
    secondary: "See seller plans",
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
      "The current validation contract is Free ~1, Creator ~5, and Shop ~15 live jobs at 10 credits each. That is a planning estimate—not a sales guarantee or an unlimited-generation promise.",
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
            Seller Starter Pack
          </Link>
          <Link
            href="/modules"
            className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/55 transition hover:border-[var(--mint)]/40 hover:text-[var(--mint)]"
          >
            Modules
          </Link>
          <Link
            href="/flow"
            className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] font-semibold text-white/40 transition hover:border-white/20 hover:text-white/65"
            title="Preview media wall — not a live Seedance job"
          >
            Flow · Preview
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[var(--fg-dim)]">
          <span>✓ Cached prototypes use no credits</span>
          <span>✓ Failed live jobs return their credit charge</span>
          <span>✓ Commercial use starts on paid plans</span>
          <span>✓ Live billing stays off until you greenlight Mode A</span>
        </div>
      </div>
    </section>
  );
}
