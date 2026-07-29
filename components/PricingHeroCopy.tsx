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
    eyebrow: "One finite plan · no unlimited",
    title: "Pricing built around finished toy videos.",
    description:
      "The Founding Studio candidate is measured in fixed Launch Packs, not vague AI usage. Subscriptions open after the private beta proves quality, recovery, and sustainable cost.",
  },
  "cost-control": {
    eyebrow: "Measured capacity · visible limits",
    title: "Know exactly how many product clips are included.",
    description:
      "Three monthly Launch Packs means nine fixed 5-second 720p outputs. Subscriptions open after the private beta proves quality, recovery, and sustainable cost.",
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
        className="pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full bg-[#c8ff3d]/55 blur-[90px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-white">
            Founding Studio
          </span>
          <span className="rounded-full border border-black/15 bg-white/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-black/48">
            Validation candidate · not yet for sale
          </span>
        </div>

        <p className="mt-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#5e7800]">
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
            href="/create?mode=seller-pack"
            className="inline-flex min-h-13 items-center justify-center rounded-full bg-black px-7 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Preview the 3-video Pack
            <span className="ml-2 text-[#c8ff3d]" aria-hidden>
              ↗
            </span>
          </Link>
          <Link
            href="#plans"
            className="inline-flex min-h-13 items-center justify-center rounded-full border border-black/20 bg-white/45 px-7 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white"
          >
            See the candidate plan
          </Link>
        </div>

        <div className="mx-auto mt-9 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-black/15 bg-black/15 sm:grid-cols-3">
          {[
            ["3 Packs", "per billing month"],
            ["9 videos", "fixed 5-second outputs"],
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
