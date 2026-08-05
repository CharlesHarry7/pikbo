import type { Metadata } from "next";
import Link from "next/link";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import { FOUNDING_STUDIO_MOMENTS, getPlan } from "@/lib/pricing";
import { site } from "@/lib/site";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const PRICING_PREVIEW_HREF =
  `${MOMENT_CREATE_HREF}&source=pricing-preview&try=1&sample=beatbot` as const;

const LAB_VIEWER_EXPLORE_HREF = "/explore" as const;
const FOUNDING_INTENT_HREF =
  "/contact?source=pricing-founding-intent" as const;

export const metadata: Metadata = {
  title: "Pikbo Pricing · Lab free + Founding Studio",
  description:
    "Compare free Lab Viewer demos with Founding Studio — Pikbo's $49 monthly private-beta plan for nine directed toy-video Moments. Public live checkout remains gated until delivery and billing validation pass.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pikbo Pricing · Lab free + Founding Studio`,
    description:
      "Free Lab Viewer demos plus nine directed toy-video Moments for $49/month. Public live checkout remains gated until private-beta delivery and billing validation pass.",
    url: `${site.url}/pricing`,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: "Pikbo Lab free tier and Founding Studio private beta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Pikbo Pricing · Lab free + Founding Studio`,
    description:
      "Free Lab Viewer demos plus nine directed toy-video Moments for $49/month. Public live checkout remains gated until private-beta delivery and billing validation pass.",
    images: [site.socialImages.twitter],
  },
};

const STUDIO_VALUE = [
  ["Choose one Moment", "Directed preset", "No prompt or model hunting"],
  ["Create one clip", "One clear outcome", "Use only the format you need"],
  ["Keep it private", "Owner-only delivery", "Return through Library"],
] as const;

/** Compact free vs paid comparison (✓ / — symbols for scanability). */
const COMPARISON_ROWS: readonly {
  feature: string;
  free: string;
  studio: string;
  freeTone: "check" | "dash" | "text";
  studioTone: "check" | "dash" | "text";
}[] = [
  {
    feature: "Lab demo access",
    free: "✓ Watch",
    studio: "✓ Watch",
    freeTone: "check",
    studioTone: "check",
  },
  {
    feature: "Monthly Moments",
    free: "—",
    studio: `${FOUNDING_STUDIO_MOMENTS} directed clips`,
    freeTone: "dash",
    studioTone: "text",
  },
  {
    feature: "Private delivery",
    free: "—",
    studio: "✓",
    freeTone: "dash",
    studioTone: "check",
  },
  {
    feature: "Library recovery",
    free: "—",
    studio: "✓",
    freeTone: "dash",
    studioTone: "check",
  },
  {
    feature: "Owner-only downloads",
    free: "—",
    studio: "✓",
    freeTone: "dash",
    studioTone: "check",
  },
  {
    feature: "Format options",
    free: "Preview only",
    studio: "9:16 · 5s · 720p",
    freeTone: "text",
    studioTone: "text",
  },
];

const pricingFaqItems = [
  {
    question: "Can I subscribe to Founding Studio today?",
    answer:
      "Public live checkout is not open yet. Leave founding intent via contact, or preview a Lab Moment while Pikbo validates private delivery, recovery, and billing.",
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
    question: "What is free today?",
    answer:
      "Lab Viewer is free forever: watch every labeled Pikbo Lab demo on Explore. Uploads are not processed on the public demo path, and no live provider call runs without private-beta access.",
  },
  {
    question: "Will the subscription be unlimited?",
    answer:
      "No. Founding Studio will use a finite monthly allowance so delivery quality, retries, and private storage remain sustainable.",
  },
] as const;

function cellClass(tone: "check" | "dash" | "text") {
  if (tone === "check") return "status-card__check";
  if (tone === "dash") return "status-card__dash";
  return "font-semibold text-[var(--toy-cream)]/80";
}

export default function PricingPage() {
  const freePlan = getPlan("free");
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
      className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[var(--void)] px-4 py-10 text-[var(--cream)] sm:px-8 sm:py-16"
      data-pricing-path="product-first"
      data-pricing-theme="toy-collectible"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(48%_80%_at_50%_0%,rgba(177,78,255,0.28),transparent_70%),radial-gradient(36%_60%_at_80%_10%,rgba(255,78,205,0.16),transparent_65%)]"
        aria-hidden
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--neon-pink)]">
            Lab Viewer free · Founding Studio private beta
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.75rem,7vw,5.75rem)] font-black leading-[0.88] tracking-[-0.07em]">
            <span className="text-bling">Start free.</span> Upgrade when you
            ship.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/55 sm:text-lg sm:leading-7">
            Watch every labeled Pikbo Lab demo at $0 forever, then step into
            Founding Studio when you need private, directed Moments from a
            rights-owned toy photo. The founding offer is nine directed Moments
            for $49/month.{" "}
            Public payment remains locked until every private-delivery and billing
            gate passes.
          </p>
        </div>

        <div className="mt-9 grid min-w-0 gap-5 lg:mt-12 lg:grid-cols-2 lg:items-stretch">
          {/* Lab Viewer — free tier polish (toy tokens only); min-w-0 keeps 390px shelf in-flow */}
          <article
            className="pricing-free-card toy-sticker-enter relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-8"
            data-pricing-plan="lab-viewer"
            data-pricing-tier="free"
            data-pricing-mobile="390-safe"
          >
            <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
            <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />

            <div className="flex flex-wrap items-center gap-2">
              <span className="toy-sticker toy-sticker-lime">Free forever</span>
              <span className="toy-sticker toy-sticker-outline">0 credits</span>
              <span className="toy-sticker toy-sticker-aqua">Cached only</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-black tracking-[-0.04em] text-[var(--toy-ink)] sm:text-4xl">
                Lab Viewer
              </h2>
              <span className="rounded-full border border-[var(--toy-ink)]/10 bg-white/60 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-[var(--toy-ink)]/55">
                Free tier
              </span>
            </div>

            <p className="mt-6 font-display text-5xl font-black tracking-[-0.055em] text-[var(--toy-ink)] sm:text-6xl">
              ${freePlan.priceMonthly}
              <span className="ml-1 text-sm font-bold tracking-normal text-[var(--toy-ink)]/40">
                / forever
              </span>
            </p>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--toy-ink)]/55">
              Watch all Pikbo Lab demos with no account and no card. Cached
              prototypes only — your upload is not processed on the public demo
              path.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm font-semibold text-[var(--toy-ink)]/70">
              <li className="flex items-start gap-2">
                <span
                  className="mt-0.5 font-black text-[var(--toy-neon)]"
                  aria-hidden
                >
                  ✓
                </span>
                <span>Watch all Pikbo Lab demos</span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="mt-0.5 font-black text-[var(--toy-neon)]"
                  aria-hidden
                >
                  ✓
                </span>
                <span>Labeled cached prototypes · 0 credits</span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="mt-0.5 font-black text-[var(--toy-neon)]"
                  aria-hidden
                >
                  ✓
                </span>
                <span>No payment · no live provider call</span>
              </li>
            </ul>

            <div className="mt-auto pt-7">
              <Link
                href={LAB_VIEWER_EXPLORE_HREF}
                className="pricing-free-card__cta link-sweep inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--toy-ink)]/15 bg-white/40 px-5 text-sm font-black text-[var(--toy-ink)] backdrop-blur-sm transition hover:bg-white/70"
                data-pricing-cta="lab-viewer-explore"
              >
                Watch Lab demos
              </Link>
              <p className="mt-3 text-center text-[10px] font-semibold leading-relaxed text-[var(--toy-ink)]/40">
                Opens Explore · free forever · not your photo motion
              </p>
            </div>
          </article>

          {/* Founding Studio — featured pricing-card; paid CTA closed without Stripe */}
          <article
            className="pricing-card pricing-card--featured flex min-w-0 flex-col overflow-hidden p-5 sm:p-8"
            data-pricing-state="closed-beta"
            data-pricing-plan="founding-studio"
            data-pricing-mobile="390-safe"
          >
            <div className="pricing-card__stripe" aria-hidden>
              Most Popular
            </div>
            <div className="flex flex-wrap items-center gap-2 pr-10">
              <h2 className="font-display text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                Founding Studio
              </h2>
              <span className="rounded-full bg-[linear-gradient(135deg,var(--electric-purple),var(--neon-pink))] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white">
                Closed beta
              </span>
            </div>
            <p className="mt-7 font-display text-5xl font-black tracking-[-0.055em] text-[var(--toy-neon)] sm:text-6xl">
              ${foundingStudio.priceMonthly}
              <span className="ml-1.5 align-middle text-sm font-bold tracking-normal text-[var(--toy-fog)]">
                / mo
              </span>
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--toy-fog)]">
              founding rate
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--toy-cream)]/55">
              A finite allowance for directed toy-video Moments. Public live
              checkout remains locked until private delivery, billing, and
              refund gates pass. Without Stripe keys, the paid CTA stays closed
              — founding intent only, never a live charge.
            </p>

            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-white/12">
              <div className="border-b border-white/12 bg-white/[0.045] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[var(--toy-neon)]">
                  The product promise
                </p>
              </div>
              {STUDIO_VALUE.map(([name, value, note], index) => (
                <div
                  key={name}
                  className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-3.5 ${
                    index ? "border-t border-white/10" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-black">{name}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[var(--toy-cream)]/38">
                      {note}
                    </p>
                  </div>
                  <span className="self-center rounded-full border border-[var(--neon-pink)]/35 bg-[var(--neon-pink)]/10 px-2.5 py-1 text-[10px] font-black text-[var(--neon-pink)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="pricing-card__cta mt-7 max-w-none">
              <PricingCheckoutButton
                planId="founding_studio"
                label={`Join Founding Studio · $${foundingStudio.priceMonthly}/month`}
                featured
              />
            </div>
            <Link
              href={FOUNDING_INTENT_HREF}
              className="mt-4 inline-block text-xs font-bold text-[var(--toy-cream)]/58 underline decoration-white/20 underline-offset-4 hover:text-[var(--toy-fluo)]"
              data-pricing-cta="founding-intent"
            >
              Join founding waitlist · intent only
            </Link>
            <Link
              href={PRICING_PREVIEW_HREF}
              className="mt-3 inline-block text-xs font-bold text-[var(--toy-cream)]/58 underline decoration-white/20 underline-offset-4 hover:text-[var(--toy-fluo)]"
            >
              Preview one Pikbo Lab Moment
            </Link>
          </article>
        </div>

        {/* Comparison — status-card rails */}
        <section
          className="mx-auto mt-12 max-w-4xl sm:mt-16"
          aria-labelledby="plan-compare-title"
          data-pricing-compare="lab-viewer-vs-founding-studio"
        >
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Compare plans
            </p>
            <h2
              id="plan-compare-title"
              className="mt-2 font-display text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl"
            >
              Free vs Founding Studio
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-white/52">
              Day-1 free tier anchors the founding rate. Lab Viewer never
              processes your product photo; Founding Studio is the private paid
              path when gates open.
            </p>
          </div>

          <div className="status-card pricing-compare mt-6 min-w-0 overflow-x-auto overscroll-x-contain p-0 sm:p-0">
            <table className="pricing-compare__table w-full min-w-0 border-collapse text-left text-sm">
              <caption className="sr-only">
                Feature comparison between free Lab Viewer and Founding Studio
              </caption>
              <thead>
                <tr className="status-card__head">
                  <th
                    scope="col"
                    className="px-3 py-3 font-display text-[9px] font-black uppercase tracking-[0.12em] text-white/70 sm:px-5 sm:py-3.5 sm:text-[10px] sm:tracking-[0.14em]"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 font-display text-[9px] font-black uppercase tracking-[0.12em] text-[var(--toy-pink)] sm:px-5 sm:py-3.5 sm:text-[10px] sm:tracking-[0.14em]"
                  >
                    Lab Viewer
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 font-display text-[9px] font-black uppercase tracking-[0.12em] text-[var(--toy-neon)] sm:px-5 sm:py-3.5 sm:text-[10px] sm:tracking-[0.14em]"
                  >
                    Founding Studio
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className={`status-card__row border-t border-white/[0.06] ${
                      row.freeTone === "check"
                        ? "status-card__row--pink"
                        : "status-card__row--neon"
                    }`}
                  >
                    <th
                      scope="row"
                      className="max-w-[7.5rem] px-3 py-3 pl-4 text-xs font-black leading-snug text-white sm:max-w-none sm:px-5 sm:py-3.5 sm:pl-6 sm:text-sm"
                    >
                      {row.feature}
                    </th>
                    <td
                      className={`break-words px-2 py-3 text-[11px] leading-snug sm:px-5 sm:py-3.5 sm:text-sm ${cellClass(row.freeTone)}`}
                    >
                      {row.free}
                    </td>
                    <td
                      className={`break-words px-2 py-3 text-[11px] leading-snug sm:px-5 sm:py-3.5 sm:text-sm ${cellClass(row.studioTone)}`}
                    >
                      {row.studio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="mx-auto mt-12 max-w-4xl border-t border-white/10 pt-8 sm:mt-16 sm:pt-10"
          aria-labelledby="pricing-faq-title"
        >
          <h2
            id="pricing-faq-title"
            className="font-display text-2xl font-black tracking-[-0.04em] text-white"
          >
            Before Founding Studio opens
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pricingFaqItems.map((item) => (
              <article key={item.question} className="stat-card p-5">
                <h3 className="text-sm font-black leading-5 text-[var(--cream)]">
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
