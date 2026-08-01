import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Founding Studio · Closed Beta",
  description:
    "Founding Studio is Pikbo's closed-beta Launch Pack subscription for independent toy sellers. Public checkout is not open.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pikbo Founding Studio · Closed Beta`,
    description:
      "One finite Launch Pack subscription for toy sellers. Public checkout remains closed.",
    url: `${site.url}/pricing`,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: "Pikbo Founding Studio closed beta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Pikbo Founding Studio · Closed Beta`,
    description:
      "One finite Launch Pack subscription for toy sellers. Public checkout remains closed.",
    images: [site.socialImages.twitter],
  },
};

const FORMATS = [
  ["Listing Spin", "1:1", "Marketplace listings"],
  ["Blind-box Reveal", "9:16", "Drops and restocks"],
  ["Social Flash", "9:16", "Reels and short-form"],
] as const;

const pricingFaqItems = [
  {
    question: "Can I subscribe to Founding Studio today?",
    answer:
      "No. Pikbo is still validating private delivery and recovery with invited toy sellers, so public checkout remains closed.",
  },
  {
    question: "What is included in one Launch Pack?",
    answer:
      "The planned Pack contains three fixed formats from one toy photo: Listing Spin, Blind-box Reveal, and Social Flash.",
  },
  {
    question: "Will the subscription be unlimited?",
    answer:
      "No. Founding Studio will use a finite monthly Pack allowance so delivery quality, retries, and private storage remain sustainable.",
  },
] as const;

export default function PricingPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pricingFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div
      className="min-h-[calc(100svh-4rem)] bg-[#09090B] px-3 py-7 text-[#F4F4F5] sm:px-6 sm:py-10"
      data-pricing-path="product-first"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#C8FF3D]">
            Founding Studio · closed beta
          </p>
          <h1 className="mt-2 font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            One plan for every toy drop.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-white/48 sm:text-sm sm:leading-6">
            A finite subscription for independent toy sellers who need the same
            three launch assets for every new SKU.
          </p>
        </div>

        <article
          className="relative mx-auto mt-6 max-w-4xl overflow-hidden rounded-[0.95rem] border border-white/[0.08] bg-[#121214] p-4 text-[#F4F4F5] sm:mt-8 sm:p-6"
          data-pricing-state="closed-beta"
        >
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                  Founding Studio
                </h2>
                <span className="rounded-full border border-[#C8FF3D]/28 bg-[#C8FF3D]/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#C8FF3D]">
                  Closed beta
                </span>
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-[-0.045em]">
                Not on sale yet
              </p>
              <p className="mt-3 max-w-md text-xs leading-5 text-white/48">
                Pricing and the monthly Pack allowance will be announced when
                the private beta is ready to open. There is no public checkout
                today. There is no Free plan comparison while the single
                Founding Studio offer remains closed.
              </p>

              <Link
                href="/create?mode=seller-pack&source=pricing-preview&try=1&sample=scout"
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#C8FF3D] px-5 text-xs font-bold text-[#09090B] transition hover:bg-[#D6FF70] sm:w-auto"
              >
                Preview the three formats
              </Link>
              <p className="mt-2 text-[10px] text-white/36">
                Pikbo Lab samples only · no product-photo input · no payment
              </p>
            </div>

            <div className="overflow-hidden rounded-[0.85rem] border border-white/[0.08] bg-[#1A1A1E] text-[#F4F4F5]">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#C8FF3D]">
                  Every Launch Pack
                </p>
              </div>
              {FORMATS.map(([name, ratio, channel], index) => (
                <div
                  key={name}
                  className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 ${
                    index ? "border-t border-white/[0.08]" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="mt-1 text-[10px] text-white/40">
                      {channel}
                    </p>
                  </div>
                  <span className="self-center rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/58">
                    {ratio}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/[0.08] bg-black/10 px-4 py-4 text-xs leading-5 text-white/43">
                Private Library delivery, owner-only downloads, and a finite
                monthly allowance when Founding Studio opens.
              </div>
            </div>
          </div>
        </article>

        <section
          className="mx-auto mt-9 max-w-4xl border-t border-white/[0.08] pt-7 sm:mt-11"
          aria-labelledby="pricing-faq-title"
        >
          <h2
            id="pricing-faq-title"
            className="text-2xl font-semibold tracking-[-0.04em]"
          >
            Before Founding Studio opens
          </h2>
          <div className="mt-4 grid gap-px overflow-hidden rounded-[0.85rem] border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
            {pricingFaqItems.map((item) => (
              <article key={item.question} className="bg-[#121214] p-5">
                <h3 className="text-sm font-semibold leading-5">
                  {item.question}
                </h3>
                <p className="mt-3 text-xs leading-5 text-white/46">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
