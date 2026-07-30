import Link from "next/link";

type HighIntentFocus = "generator" | "listing-spin" | "blind-box";

const USE_LABELS: Record<HighIntentFocus, string> = {
  generator: "Listing, launch, and social drafts",
  "listing-spin": "Marketplace listings and product pages",
  "blind-box": "Reveal pacing reference; Live reveal still pending",
};

export function HighIntentProductTruth({
  focus,
}: {
  focus: HighIntentFocus;
}) {
  const blindBoxPending = focus === "blind-box";

  return (
    <section
      className="container-x py-10"
      data-product-proof="single-private-listing-spin"
    >
      <div className="rounded-[1.75rem] border border-white/12 bg-white/[0.035] p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--mint)]">
          Verified result vs. current limit
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
          What Pikbo has actually proven
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--fg-muted)]">
          One private technical run used an original, unbranded synthetic toy
          still and produced a downloadable Listing Spin. It is internal
          validation—not a physical product, customer testimonial, or seller
          case study.
        </p>

        <dl className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Input", "1 rights-recorded internal toy still"],
            [
              "Verified output",
              blindBoxPending
                ? "Listing Spin only · Blind-box Live result pending"
                : "Listing Spin · 1:1 · Fast 720p · 5.042 sec",
            ],
            ["Download time", "About 2 min 39 sec"],
            ["Intended use", USE_LABELS[focus]],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <dt className="text-[9px] font-black uppercase tracking-[0.17em] text-white/42">
                {label}
              </dt>
              <dd className="mt-4 text-sm font-bold leading-5 text-white/88">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--mint)]/20 bg-[var(--mint)]/[0.06] p-5">
            <h3 className="font-black text-white">Recovery proved</h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              The finished private file reopened from Library after refresh,
              and a second download was byte-identical. Ten credits settled
              once.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
            <h3 className="font-black text-white">Not proved yet</h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              No physical-SKU case, verified three-video Pack, target-seller
              reuse, or paid order exists yet. Treat generated angles as drafts
              and check sculpt, paint, logos, packaging, and proportions.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <Link
            href="/create?mode=seller-pack"
            className="btn btn-primary !px-5 !py-3 text-xs font-black"
          >
            Preview the fixed Launch Pack
          </Link>
          <Link
            href="/pricing"
            className="btn btn-ghost !px-4 !py-3 text-xs font-black"
          >
            See beta limits
          </Link>
        </div>
      </div>
    </section>
  );
}
