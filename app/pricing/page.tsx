import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Founding Studio · Closed Beta",
  description:
    "Founding Studio is Pikbo's planned $49/month Launch Pack subscription for independent toy sellers. Private-beta applications are open; public checkout is closed.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pikbo Founding Studio · Closed Beta`,
    description:
      "A planned $49/month finite Launch Pack subscription for toy sellers. Private-beta applications are open; public checkout remains closed.",
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
      "A planned $49/month finite Launch Pack subscription for toy sellers. Private-beta applications are open; public checkout remains closed.",
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
      "Not through public checkout. Pikbo is accepting applications for an invited private beta while validating delivery and recovery. Applying is free and is not a purchase.",
  },
  {
    question: "What is included in one Launch Pack?",
    answer:
      "The planned Pack contains three fixed formats from one toy photo: Listing Spin, Blind-box Reveal, and Social Flash.",
  },
  {
    question: "What is the planned launch price?",
    answer:
      "The current Founding Studio launch candidate is $49 per month for three Launch Packs, or nine videos. The final paid offer will be shown before any charge.",
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
      className="min-h-[calc(100svh-4rem)] bg-[#F7F4ED] px-4 py-10 text-[#0A0A0A] sm:px-8 sm:py-16"
      data-pricing-path="product-first"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/44">
            Founding Studio · closed beta
          </p>
          <h1 className="mt-3 font-display text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.88] tracking-[-0.07em]">
            One plan for your next toy launch.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-6 text-black/54 sm:text-lg sm:leading-7">
            A finite subscription for independent toy sellers who need the same
            three launch assets for every new SKU. Private-beta applications
            are open; public payment is not.
          </p>
        </div>

        <article
          className="relative mx-auto mt-9 max-w-4xl overflow-hidden rounded-[2rem] border border-black/15 bg-[#0A0A0A] p-5 text-[#F7F4ED] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.7)] sm:mt-12 sm:p-8"
          data-pricing-state="closed-beta"
        >
          <div
            className="absolute inset-x-0 top-0 h-1 bg-[#CBFF3D]"
            aria-hidden
          />
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  Founding Studio
                </h2>
                <span className="rounded-full bg-[#CBFF3D] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-[#0A0A0A]">
                  Closed beta
                </span>
              </div>
              <p className="mt-7 text-4xl font-black tracking-[-0.055em]">
                ${company.plannedOffer.monthlyPriceUsd}
                <span className="text-base text-[#F7F4ED]/45"> / month planned</span>
              </p>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#F7F4ED]/50">
                The current launch candidate includes {company.plannedOffer.launchPacksPerMonth} Launch
                Packs ({company.plannedOffer.launchPacksPerMonth * company.plannedOffer.videosPerPack} videos) per month. The final paid offer will be shown before
                any charge. There is no public checkout today.
              </p>

              <Link
                href="/contact"
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#CBFF3D] px-6 text-sm font-black text-[#0A0A0A] transition hover:-translate-y-0.5 hover:bg-[#D4FF62] sm:w-auto"
              >
                Apply to the private beta
              </Link>
              <p className="mt-2 text-[10px] font-semibold text-[#F7F4ED]/34">
                Free application · no card · no payment
              </p>
              <Link
                href="/create?mode=seller-pack&source=pricing-preview&try=1&sample=scout"
                className="mt-4 inline-block text-xs font-bold text-[#F7F4ED]/58 underline decoration-white/20 underline-offset-4 hover:text-[#CBFF3D]"
              >
                Preview the three Pikbo Lab formats
              </Link>
            </div>

            <div className="overflow-hidden rounded-[1.4rem] border border-white/12">
              <div className="border-b border-white/12 bg-white/[0.045] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#CBFF3D]">
                  Every Launch Pack
                </p>
              </div>
              {FORMATS.map(([name, ratio, channel], index) => (
                <div
                  key={name}
                  className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 ${
                    index ? "border-t border-white/10" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-black">{name}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[#F7F4ED]/38">
                      {channel}
                    </p>
                  </div>
                  <span className="self-center rounded-full border border-white/14 px-2.5 py-1 text-[10px] font-black text-[#CBFF3D]">
                    {ratio}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/10 bg-white/[0.03] px-4 py-4 text-xs font-semibold leading-5 text-[#F7F4ED]/48">
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
          <div className="mt-5 grid gap-px overflow-hidden rounded-[1.4rem] border border-black/12 bg-black/12 md:grid-cols-2 lg:grid-cols-4">
            {pricingFaqItems.map((item) => (
              <article key={item.question} className="bg-[#F7F4ED] p-5">
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
