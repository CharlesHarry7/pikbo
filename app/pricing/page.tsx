import type { Metadata } from "next";
import Link from "next/link";
import {
  FOUNDING_STUDIO_PACKS,
  PAID_PLAN_ID,
  PLANS,
  CREDITS_PER_VIDEO,
  clipsFromCredits,
} from "@/lib/pricing";
import { site } from "@/lib/site";
import { createRemixHref } from "@/lib/remixIntent";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PricingUsageEstimator } from "@/components/PricingUsageEstimator";
import { PricingPlanCards } from "@/components/PricingPlanCards";
import {
  PricingHeroCopy,
  type PricingCopyVariant,
} from "@/components/PricingHeroCopy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Pricing bottom Animate CTA — listing spin remix; source tags the door. */
const PRICING_ANIMATE_HREF = createRemixHref(
  "360-spin-showcase",
  "pricing-bottom"
);

export const metadata: Metadata = {
  title: "Pricing for Toy Sellers and Collectors",
  description: `Compare finite-credit ${site.name} plans for turning owned toy photos into listing, launch, and social videos. Live billing remains closed during validation.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pikbo Pricing for Toy Sellers and Collectors`,
    description: `Free cached prototypes and one finite Founding Studio Launch Pack plan. Live billing stays off during validation.`,
    url: `${site.url}/pricing`,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: "Pikbo pricing for finite toy-video launch workflows",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Pikbo Pricing for Toy Sellers and Collectors`,
    description: `Free cached prototypes and one finite Founding Studio Launch Pack plan. Live billing stays off during validation.`,
    images: [site.socialImages.twitter],
  },
};

/** Shared FAQ body + FAQPage JSON-LD (Phase H — no thin structured data). */
function pricingFaqItems(): { q: string; a: string }[] {
  return [
    {
      q: "What does the current credit number mean?",
      a: `Each finished Launch Pack clip uses ${CREDITS_PER_VIDEO} credits. The three-format Pack uses 30 credits; a confirmed failed format restores its 10 credits.`,
    },
    {
      q: "Can I test this with one real product photo?",
      a: `Yes. Preview ${site.name}'s three formats, then open Create with a photo of a toy you own. Once private Live is enabled, eligible invited accounts can make a private 5-second 720p result; the public demo shows labeled examples without processing your upload.`,
    },
    {
      q: "Can I use clips commercially?",
      a: "Founding Studio is intended to include commercial use for reviewed listings and ads made from toy photos you own. Subscriptions are not open yet, and generated angles or product details must be checked before publishing.",
    },
    {
      q: "Is any plan unlimited?",
      a: "No. Every plan has a finite credit allowance and a fixed number of Launch Pack outputs.",
    },
    {
      q: "Can the credit rate change?",
      a: "Yes, but Pikbo will show the exact quote before generation. Existing completed charges do not change retroactively.",
    },
  ];
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ copy?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedCopy = Array.isArray(params.copy)
    ? params.copy[0]
    : params.copy;
  const copyVariant: PricingCopyVariant =
    requestedCopy === "cost" ? "cost-control" : "outcome";
  const faq = pricingFaqItems();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <PricingHeroCopy variant={copyVariant} />

      <div className="container-x py-12 sm:py-16">
        <Card className="mb-8 overflow-hidden border-[var(--mint)]/25 bg-gradient-to-br from-[var(--mint)]/[0.08] via-[var(--mint)]/[0.03] to-transparent shadow-[0_0_40px_rgba(200,255,61,0.06)]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--fg)]">
                Plan around finished product clips — not vague AI usage
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--fg-muted)]">
                The current paid candidate is {FOUNDING_STUDIO_PACKS} fixed
                Launch Packs: one owned SKU photo becomes three 5-second 720p
                formats. Subscriptions open only after private-beta results meet
                the published quality, recovery, and cost targets.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <Badge variant="outline">Fixed 3-video pack</Badge>
              <Badge variant="live" className="normal-case">
                Not yet for sale
              </Badge>
            </div>
          </CardContent>
        </Card>

        <PricingUsageEstimator />

        <div id="plans" className="mt-16 scroll-mt-24">
          <div className="mb-8 text-center">
            <p className="section-label">Plans</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Choose the volume that matches your catalog
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--fg-muted)]">
              Test one owned toy, prepare a small product batch, or plan a
              finite catalog run. No plan is unlimited.
            </p>
          </div>
          <PricingPlanCards />
        </div>

        <Separator className="my-16" />

        <section>
          <div className="mb-6">
            <p className="section-label">Compare</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              What changes when your product workload grows
            </h2>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="p-4 font-medium text-[var(--fg-dim)]">
                      Capability
                    </th>
                    {PLANS.map((plan) => (
                      <th key={plan.id} className="p-4 text-base font-bold">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-[var(--fg-muted)]">
                  {[
                    [
                      "Monthly credits",
                      ...PLANS.map((plan) => plan.credits.toLocaleString()),
                    ],
                    [
                      "Included output",
                      ...PLANS.map((plan) =>
                        plan.id === PAID_PLAN_ID
                          ? `${clipsFromCredits(plan.credits)} fixed videos`
                          : "Cached prototypes"
                      ),
                    ],
                    [
                      "Resolution",
                      ...PLANS.map((plan) =>
                        plan.id === PAID_PLAN_ID ? plan.resolution : "Preview sample"
                      ),
                    ],
                    [
                      "Delivery",
                      ...PLANS.map((plan) =>
                        plan.id === PAID_PLAN_ID
                          ? "Private Library"
                          : "Labeled example"
                      ),
                    ],
                    [
                      "Commercial use",
                      ...PLANS.map((plan) => (plan.commercial ? "✓" : "—")),
                    ],
                    [
                      "Three-format Launch Pack",
                      ...PLANS.map((plan) =>
                        plan.id === PAID_PLAN_ID ? "✓" : "—"
                      ),
                    ],
                    [
                      "Unused credits",
                      ...PLANS.map((plan) =>
                        plan.id === PAID_PLAN_ID
                          ? "Roll over while active"
                          : "Not applicable"
                      ),
                    ],
                  ].map(([label, ...values]) => (
                    <tr key={label} className="hover:bg-white/[0.02]">
                      <th className="p-4 font-medium text-[var(--fg)]">
                        {label}
                      </th>
                      {values.map((value, index) => (
                        <td key={`${label}-${PLANS[index].id}`} className="p-4">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section className="mx-auto mt-20 max-w-3xl">
          <p className="section-label">FAQ</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Pricing questions, answered plainly
          </h2>
          <div className="mt-6 space-y-3">
            {faq.map((item) => (
              <Card key={item.q} className="overflow-hidden">
                <details className="group">
                  <summary className="cursor-pointer list-none p-5 font-semibold text-[var(--fg)] marker:content-none">
                    {item.q}
                    <span className="float-right text-[var(--mint)] transition group-open:rotate-45">
                      ＋
                    </span>
                  </summary>
                  <CardContent className="border-t border-[var(--border)] pt-4 text-sm leading-6 text-[var(--fg-muted)]">
                    {item.a}
                  </CardContent>
                </details>
              </Card>
            ))}
          </div>
        </section>

        <Card className="mt-16 overflow-hidden border-[var(--mint)]/20 bg-gradient-to-br from-[var(--card)] to-black/40">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Start with one SKU you already sell</CardTitle>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Upload one owned-toy photo, choose a listing or launch recipe,
                and review the result before you publish it.
              </p>
            </div>
            <div
              className="mt-4 flex flex-wrap gap-2 sm:mt-0"
              data-pricing-path="product-first"
            >
              <Button asChild>
                <Link
                  href={PRICING_ANIMATE_HREF}
                  data-pricing-animate="remix"
                >
                  Animate one SKU
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/create?mode=seller-pack">Launch Pack</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/library">Library</Link>
              </Button>
              <FreeTrialCta
                path="/pricing#bottom"
                labelTry="Try free"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.07]"
              />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
