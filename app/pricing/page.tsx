import type { Metadata } from "next";
import Link from "next/link";
import { PLANS, CREDITS_PER_VIDEO, clipsFromCredits } from "@/lib/pricing";
import { site } from "@/lib/site";
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

export const metadata: Metadata = {
  title: "Pricing for Toy Sellers and Collectors",
  description: `Compare finite-credit ${site.name} plans for turning owned toy photos into listing, launch, and social videos. Live billing remains closed during validation.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing · ${site.name}`,
    description: `Finite Free / Creator / Shop credits for toy listing and social clips. Live billing stays off during validation.`,
    url: `${site.url}/pricing`,
  },
};

/** Shared FAQ body + FAQPage JSON-LD (Phase H — no thin structured data). */
function pricingFaqItems(): { q: string; a: string }[] {
  return [
    {
      q: "What does the current credit number mean?",
      a: `The current foundation charges ${CREDITS_PER_VIDEO} credits per eligible generation. Model-, resolution-, and duration-aware weights are next. Failed live generations are refunded.`,
    },
    {
      q: "Can I test this with one real product photo?",
      a: `Yes. Browse cached official ${site.name} examples, then open Studio with a photo of a toy you own. With provider access configured, Free includes one 5-second 480p Mini live trial; otherwise Studio returns a clearly labeled cached demo that does not animate your upload.`,
    },
    {
      q: "Can I use clips commercially?",
      a: "Creator and Shop are intended to include commercial use for reviewed listings and ads made from toy photos you own. Live billing is not open yet, and generated angles or product details must be checked before publishing.",
    },
    {
      q: "Is any plan unlimited?",
      a: "No. Video models have a real per-generation cost, so every plan shows a finite credit allowance.",
    },
    {
      q: "Can the credit rate change?",
      a: "Yes. Provider cost changes with model, output size, and duration. PIKBO will only change public weights when the same quote is enforced by the server and verified against provider billing.",
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
                Validation allowances: Free ~1 trial · Creator ~5 · Shop ~15 at
                the flat 10-credit rate. Compare production capacity — not a
                sales guarantee. Stripe live checkout stays gated until public
                Mode A.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <Badge variant="outline">Foundation aligned</Badge>
              <Badge variant="live" className="normal-case">
                Billing soft-launch
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
              finite catalog run. No plan promises unlimited model usage.
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
                      "Approx. clips",
                      ...PLANS.map((plan) =>
                        String(clipsFromCredits(plan.credits))
                      ),
                    ],
                    ["Resolution", ...PLANS.map((plan) => plan.resolution)],
                    [
                      "On-player watermark",
                      ...PLANS.map((plan) => (plan.watermark ? "✓" : "—")),
                    ],
                    [
                      "Commercial use",
                      ...PLANS.map((plan) => (plan.commercial ? "✓" : "—")),
                    ],
                    [
                      "Priority queue",
                      ...PLANS.map((plan) => (plan.priority ? "✓" : "—")),
                    ],
                    ["Batch workflow", "—", "—", "✓"],
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
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
              <Button asChild>
                <Link href="/create?source=pricing-bottom">Animate one SKU</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/flow">Flow</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/modules">Toy Modules</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/create?mode=seller-pack">Seller Pack</Link>
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
