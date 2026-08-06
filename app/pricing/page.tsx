import type { Metadata } from "next";
import Link from "next/link";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import { getPlan } from "@/lib/pricing";
import { site } from "@/lib/site";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const PRICING_PREVIEW_HREF =
  `${MOMENT_CREATE_HREF}&source=pricing-preview&try=1&sample=beatbot` as const;

export const metadata: Metadata = {
  title: "Founding Studio · Private Beta",
  description:
    "Founding Studio is Pikbo's $49 monthly private-beta plan for nine directed toy-video Moments. Public live checkout remains gated until delivery and billing validation pass.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pikbo Founding Studio · Private Beta`,
    description:
      "Nine directed toy-video Moments for $49/month. Public live checkout remains gated until private-beta delivery and billing validation pass.",
    url: `${site.url}/pricing`,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: "Pikbo Founding Studio private beta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Pikbo Founding Studio · Private Beta`,
    description:
      "Nine directed toy-video Moments for $49/month. Public live checkout remains gated until private-beta delivery and billing validation pass.",
    images: [site.socialImages.twitter],
  },
};

const STUDIO_VALUE = [
  ["Choose one Moment", "Directed preset", "No prompt or model hunting"],
  ["Create one clip", "One clear outcome", "Use only the format you need"],
  ["Keep it private", "Owner-only delivery", "Return through Library"],
] as const;

const pricingFaqItems = [
  {
    question: "Can I subscribe to Founding Studio today?",
    answer:
      "Public live checkout is not open yet. Approved sellers can rehearse the exact checkout in a Stripe test Preview while Pikbo validates private delivery, recovery, and billing.",
  },
  {
    question: "What will Founding Studio include?",
    answer:
      "The founding offer is nine directed 5-second Fast 720p Moments each month, private delivery, and Library recovery for rights-owned toy photos.",
  },
  {
    question: "What is the founding rate?",
    answer:
      "The founding rate is $49 per month. A real card cannot be charged until the production billing, refund, private-delivery, and cost gates all pass.",
  },
  {
    question: "Will the subscription be unlimited?",
    answer:
      "No. Founding Studio will use a finite monthly allowance so delivery quality, retries, and private storage remain sustainable.",
  },
] as const;

export default function PricingPage() {
  const foundingStudio = getPlan("founding_studio");
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
      className="toy-page px-4 py-10 sm:px-8 sm:py-16"
      data-pricing-path="product-first"
    >
      <div className="toy-page-glow h-80" aria-hidden />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label tracking-[0.2em]">
            Founding Studio · private beta
          </p>
          <h1 className="mt-3 font-display text-[clamp(3rem,7vw,6.5rem)] font-black leading-[0.88] tracking-[-0.07em]">
            <span className="text-bling">One plan</span> for your next toy launch.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/55 sm:text-lg sm:leading-7">
            A finite subscription for independent toy sellers who want to pick
            one strong visual direction and create only the clip they need.
            The founding offer is nine directed Moments for $49/month. Public
            payment remains locked until every private-delivery and billing
            gate passes.
          </p>
        </div>

        <article
          className="effect-card relative mx-auto mt-9 max-w-4xl overflow-hidden bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-5 text-cream sm:mt-12 sm:p-8"
          data-pricing-state="closed-beta"
        >
          <div
            className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--electric-purple),var(--neon-pink),var(--tide-blue))]"
            aria-hidden
          />
          <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  Founding Studio
                </h2>
                <span className="cta-brand rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em]">
                  Closed beta
                </span>
              </div>
              <p className="mt-7 text-4xl font-black tracking-[-0.055em]">
                ${foundingStudio.priceMonthly}
                <span className="ml-1 text-sm font-bold tracking-normal text-white/45">
                  / month founding rate
                </span>
              </p>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
                A finite allowance for directed toy-video Moments. Public live
                checkout remains locked until private delivery, billing, and
                refund gates pass; an approved test Preview can rehearse the
                exact same checkout without charging a real card.
              </p>

              <div className="mt-7 max-w-sm">
                <PricingCheckoutButton
                  planId="founding_studio"
                  label={`Join Founding Studio · $${foundingStudio.priceMonthly}/month`}
                  featured
                />
              </div>
              <Link
                href="/contact?source=pricing-private-beta"
                className="link-tide mt-4 inline-block text-xs font-bold"
              >
                Request private beta access
              </Link>
              <Link
                href={PRICING_PREVIEW_HREF}
                className="link-tide mt-4 inline-block text-xs font-bold"
              >
                Preview one Pikbo Lab Moment
              </Link>
            </div>

            <div className="overflow-hidden rounded-[1.4rem] border border-white/12">
              <div className="border-b border-white/12 bg-white/[0.045] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-tide-blue">
                  The product promise
                </p>
              </div>
              {STUDIO_VALUE.map(([name, value, note], index) => (
                <div
                  key={name}
                  className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 ${
                    index ? "border-t border-white/10" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-black">{name}</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/38">
                      {note}
                    </p>
                  </div>
                  <span className="chip-pink self-center rounded-full px-2.5 py-1 text-[10px] font-black">
                    {value}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/10 bg-white/[0.03] px-4 py-4 text-xs font-semibold leading-5 text-white/48">
                Private Library delivery, owner-only downloads, and a finite
                monthly allowance when Founding Studio opens.
              </div>
            </div>
          </div>
        </article>

        <section
          className="mx-auto mt-12 max-w-4xl border-t border-white/10 pt-8 sm:mt-16 sm:pt-10"
          aria-labelledby="pricing-faq-title"
        >
          <h2
            id="pricing-faq-title"
            className="text-2xl font-black tracking-[-0.04em]"
          >
            Before Founding Studio opens
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {pricingFaqItems.map((item) => (
              <article key={item.question} className="stat-card p-5">
                <h3 className="text-sm font-black leading-5 text-cream">
                  {item.question}
                </h3>
                <p className="mt-3 text-xs font-semibold leading-5 text-white/52">
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
