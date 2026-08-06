import Link from "next/link";

export type PricingCopyVariant = "outcome" | "cost-control";

const COPY: Record<
  PricingCopyVariant,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  outcome: {
    eyebrow: "Private validation · checkout closed",
    title: "Founding Studio opens after real Moments are proven.",
    description:
      "Founding rate is $49/month for nine directed Moments. Pikbo is still measuring output quality, recovery, and p95 retry cost before public live checkout. No subscription is on sale today.",
  },
  "cost-control": {
    eyebrow: "Margin gate · checkout closed",
    title: "Cost first. Public subscription second.",
    description:
      "Founding Studio ($49 founding rate · nine Moments) will open only after quality, retry-cost, payment-fee, and 70% gross-margin gates clear. No subscription is on sale today.",
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
      className="relative isolate overflow-hidden border-b border-black/15 bg-[#f1eee6] px-5 py-14 text-black sm:px-8 sm:py-20"
      data-pricing-copy-variant={variant}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(8,8,8,0.16)_0.7px,transparent_0.7px)] [background-size:9px_9px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full bg-[var(--neon-pink)]/55 blur-[90px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-white">
            Founding Studio
          </span>
          <span className="rounded-full border border-black/15 bg-white/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-black/48">
            Coming soon · not for sale
          </span>
        </div>

        <p className="mt-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">
          {copy.eyebrow}
        </p>
        <h1 className="mx-auto mt-4 max-w-5xl text-center font-display text-[clamp(3rem,6.7vw,6.8rem)] font-black leading-[0.86] tracking-[-0.065em]">
          {copy.title}
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-center text-base font-semibold leading-7 text-black/58 sm:text-lg">
          {copy.description}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/create?mode=moment&effect=street-power-up&source=pricing-hero&try=1&sample=beatbot"
            className="inline-flex min-h-13 items-center justify-center rounded-full bg-black px-7 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Preview one Moment
            <span className="ml-2 text-[var(--neon-pink)]" aria-hidden>
              ↗
            </span>
          </Link>
          <Link
            href="/tools/ai-toy-video-generator"
            className="inline-flex min-h-13 items-center justify-center rounded-full border border-black/20 bg-white/45 px-7 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
          >
            See the validation record
          </Link>
        </div>

        <div className="mx-auto mt-9 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-black/15 bg-black/15 sm:grid-cols-3">
          {[
            ["1 Moment", "one selected video direction"],
            ["$49 founding", "nine Moments · checkout closed"],
            ["Private", "signed-in Library"],
          ].map(([value, label]) => (
            <div key={value} className="bg-white/48 px-4 py-4 text-center">
              <p className="text-sm font-black">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.13em] text-black/42">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
