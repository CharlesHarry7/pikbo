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
      className="min-h-[calc(100svh-4rem)] bg-[#0C0B0F] px-4 py-10 text-[#F3EFE6] sm:px-8 sm:py-16"
      data-pricing-path="product-first"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex border-l border-[#C45C4A] pl-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C6B59A]">
            Founding Studio · closed beta
          </p>
          <h1 className="mt-4 font-display text-[clamp(3rem,7vw,6.2rem)] font-medium leading-[0.92] tracking-[-0.065em]">
            One plan. Every toy drop.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm font-normal leading-6 text-[#F3EFE6]/52 sm:text-lg sm:leading-7">
            A finite subscription for independent toy sellers who need the same
            three launch assets for every new SKU.
          </p>
        </div>

        <article
          className="relative mx-auto mt-9 max-w-4xl overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#16141C] p-5 text-[#F3EFE6] shadow-[0_36px_110px_-64px_rgba(0,0,0,1)] sm:mt-12 sm:p-8"
          data-pricing-state="closed-beta"
        >
          <div className="absolute inset-y-8 left-0 w-px bg-[#C45C4A]" aria-hidden />
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                  Founding Studio
                </h2>
                <span className="rounded-full border border-[#C6B59A]/26 bg-[#C6B59A]/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#C6B59A]">
                  Closed beta
                </span>
              </div>
              <p className="mt-7 text-4xl font-medium tracking-[-0.055em]">
                Not on sale yet
              </p>
              <p className="mt-3 max-w-md text-sm font-normal leading-6 text-[#F3EFE6]/50">
                Pricing and the monthly Pack allowance will be announced when
                the private beta is ready to open. There is no public checkout
                today. There is no Free plan comparison while the single
                Founding Studio offer remains closed.
              </p>

              <Link
                href="/create?mode=seller-pack&source=pricing-preview&try=1&sample=scout"
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#EDE8DF] px-6 text-sm font-semibold text-[#121014] transition hover:bg-[#F3EFE6] sm:w-auto"
              >
                Preview the three formats
              </Link>
              <p className="mt-2 text-[10px] font-normal text-[#F3EFE6]/38">
                Pikbo Lab samples only · no product-photo input · no payment
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#1E1B26] text-[#F3EFE6]">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#C6B59A]">
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
                    <p className="mt-1 text-[10px] font-normal text-[#F3EFE6]/42">
                      {channel}
                    </p>
                  </div>
                  <span className="self-center rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-[#C6B59A]">
                    {ratio}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/[0.08] bg-black/10 px-4 py-4 text-xs font-normal leading-5 text-[#F3EFE6]/45">
                Private Library delivery, owner-only downloads, and a finite
                monthly allowance when Founding Studio opens.
              </div>
            </div>
          </div>
        </article>

        <section
          className="mx-auto mt-12 max-w-4xl border-t border-white/[0.08] pt-8 sm:mt-16 sm:pt-10"
          aria-labelledby="pricing-faq-title"
        >
          <h2
            id="pricing-faq-title"
            className="text-2xl font-semibold tracking-[-0.04em]"
          >
            Before Founding Studio opens
          </h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
            {pricingFaqItems.map((item) => (
              <article key={item.question} className="bg-[#16141C] p-5">
                <h3 className="text-sm font-semibold leading-5">
                  {item.question}
                </h3>
                <p className="mt-3 text-xs font-normal leading-5 text-[#F3EFE6]/46">
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
