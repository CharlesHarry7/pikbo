import type { Metadata } from "next";
import Link from "next/link";
import { CREDITS_PER_VIDEO } from "@/lib/pricing";
import { site } from "@/lib/site";
import { PricingPlanCards } from "@/components/PricingPlanCards";
import {
  PricingHeroCopy,
  type PricingCopyVariant,
} from "@/components/PricingHeroCopy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Founding Studio Pricing · Coming Soon",
  description: `${site.name} Founding Studio is not for sale yet. Public pricing and monthly Pack count will be set after private-beta quality, recovery, retry-cost, and margin validation.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pikbo Founding Studio · Coming Soon`,
    description: `No public subscription or checkout yet. Preview the fixed Launch Pack formats while private validation continues.`,
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
    title: `Pikbo Founding Studio · Coming Soon`,
    description: `No public subscription or checkout yet. Preview the fixed Launch Pack formats while private validation continues.`,
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
      a: `Not on the public path. Public visitors preview ${site.name}'s three formats with Pikbo Lab samples and no product-photo upload. Invited private-beta accounts can submit a rights-owned photo when their access is enabled.`,
    },
    {
      q: "Can I use clips commercially?",
      a: "Final commercial terms will be shown when checkout opens. Any invited beta output must use rights-owned source media and be checked for sculpt, paint, packaging, logo, and proportion drift before publishing.",
    },
    {
      q: "Is any plan unlimited?",
      a: "No. Founding Studio will be finite. Its public price and included monthly Pack count are not frozen yet.",
    },
    {
      q: "Can the credit rate change?",
      a: "The private validation contract is 10 credits per completed clip and 30 for the fixed three-format Pack. A public subscription opens only after quality and cost validation.",
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
                A real product unit first; a public price later
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--fg-muted)]">
                One Launch Pack remains the fixed three-format product. The
                monthly inclusion and price will be published only after
                private-beta output quality, recovery, p95 retry cost, payment
                fees, and a 70% gross-margin floor are measured.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <Badge variant="outline">Fixed 3-format Pack</Badge>
              <Badge variant="live" className="normal-case">
                Price pending · not for sale
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div id="plans" className="mt-12 scroll-mt-24">
          <div className="mb-8 text-center">
            <p className="section-label">One future subscription</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Founding Studio is still behind the quality gate
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--fg-muted)]">
              There is no Free plan comparison and no purchasable candidate
              price. Public visitors can inspect the fixed formats; invited
              accounts handle real photos privately.
            </p>
          </div>
          <PricingPlanCards />
        </div>

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
              <CardTitle className="text-xl">
                Inspect the Pack before pricing exists
              </CardTitle>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Public preview uses Pikbo Lab samples only. It does not accept
                or process your product photo and it does not open checkout.
              </p>
            </div>
            <div
              className="mt-4 flex flex-wrap gap-2 sm:mt-0"
              data-pricing-path="product-first"
            >
              <Button asChild>
                <Link href="/create?mode=seller-pack&source=pricing-bottom&try=1&sample=scout">
                  Preview the 3 formats
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/tools/ai-toy-video-generator">
                  See the validation record
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
