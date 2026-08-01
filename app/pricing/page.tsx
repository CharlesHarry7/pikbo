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
      className="min-h-[calc(100svh-4rem)] bg-[#F6F0E5] px-4 py-10 text-[#17131D] sm:px-8 sm:py-16"
      data-pricing-path="product-first"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rotate-[-1deg] rounded-full bg-[#FF5A47] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
            Founding Studio · closed beta
          </p>
          <h1 className="mt-3 font-display text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.88] tracking-[-0.07em]">
            One plan. Every toy drop.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-6 text-black/54 sm:text-lg sm:leading-7">
            A finite subscription for independent toy sellers who need the same
            three launch assets for every new SKU.
          </p>
        </div>

        <article
          className="relative mx-auto mt-9 max-w-4xl overflow-hidden rounded-[2rem] border-2 border-[#17131D] bg-[#4A55FF] p-5 text-white shadow-[10px_10px_0_#17131D] sm:mt-12 sm:p-8"
          data-pricing-state="closed-beta"
        >
          <div
            className="absolute inset-x-0 top-0 h-2 bg-[#FFD447]"
            aria-hidden
          />
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  Founding Studio
                </h2>
                <span className="rounded-full bg-[#FFD447] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#17131D]">
                  Closed beta
                </span>
              </div>
              <p className="mt-7 text-4xl font-black tracking-[-0.055em]">
                Not on sale yet
              </p>
              <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/65">
                Pricing and the monthly Pack allowance will be announced when
                the private beta is ready to open. There is no public checkout
                today. There is no Free plan comparison while the single
                Founding Studio offer remains closed.
              </p>

              <Link
                href="/create?mode=seller-pack&source=pricing-preview&try=1&sample=scout"
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#FF5A47] px-6 text-sm font-black text-white shadow-[4px_4px_0_#17131D] transition hover:-translate-y-0.5 hover:bg-[#f34d3a] sm:w-auto"
              >
                Preview the three formats
              </Link>
              <p className="mt-2 text-[10px] font-semibold text-white/46">
                Pikbo Lab samples only · no product-photo input · no payment
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.4rem] border-2 border-white/60 bg-[#F6F0E5] text-[#17131D]">
              <div className="border-b-2 border-[#17131D]/14 bg-[#FFD447] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#17131D]">
                  Every Launch Pack
                </p>
              </div>
              {FORMATS.map(([name, ratio, channel], index) => (
                <div
                  key={name}
                  className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 ${
                    index ? "border-t border-[#17131D]/12" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-black">{name}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[#17131D]/48">
                      {channel}
                    </p>
                  </div>
                  <span className={`self-center rounded-full px-2.5 py-1 text-[10px] font-black text-white ${index === 0 ? "bg-[#4A55FF]" : "bg-[#FF5A47]"}`}>
                    {ratio}
                  </span>
                </div>
              ))}
              <div className="border-t border-[#17131D]/12 bg-white/55 px-4 py-4 text-xs font-semibold leading-5 text-[#17131D]/55">
                Private Library delivery, owner-only downloads, and a finite
                monthly allowance when Founding Studio opens.
              </div>
            </div>
          </div>
        </article>

        <section
          className="mx-auto mt-12 max-w-4xl border-t border-black/12 pt-8 sm:mt-16 sm:pt-10"
          aria-labelledby="pricing-faq-title"
        >
          <h2
            id="pricing-faq-title"
            className="text-2xl font-black tracking-[-0.04em]"
          >
            Before Founding Studio opens
          </h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-[1.4rem] border border-black/12 bg-black/12 md:grid-cols-3">
            {pricingFaqItems.map((item) => (
              <article key={item.question} className="bg-[#F6F0E5] p-5">
                <h3 className="text-sm font-black leading-5">
                  {item.question}
                </h3>
                <p className="mt-3 text-xs font-semibold leading-5 text-black/52">
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
