"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Public pricing stays a single closed Founding Studio proposition.
 * Founding rate ($49 / 9 Moments) is disclosed; public live checkout stays
 * closed until quality, recovery, privacy, and margin gates pass.
 */
export function PricingPlanCards() {
  const measuredBeforeOpen = [
    "Choose one directed Moment and create only the clip you need",
    "Private Library delivery and owner-only downloads",
    "Founding rate $49/month for nine directed Moments when billing opens",
    "Checkout remains closed until quality, recovery, privacy, and margin gates pass",
  ];

  return (
    <Card
      id="plan-founding_studio"
      className="relative mx-auto flex max-w-2xl scroll-mt-24 flex-col overflow-hidden border-[var(--mint)]/40 shadow-[0_0_0_1px_rgba(200,255,61,0.2),0_24px_60px_-24px_rgba(0,0,0,0.85)]"
      data-pricing-state="coming-soon"
    >
      <div className="absolute inset-x-0 top-0 h-1 [background:var(--grad)]" />
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Founding Studio</CardTitle>
          <Badge variant="brand">Coming soon · checkout closed</Badge>
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">$49 founding rate</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.13em] text-[var(--fg-dim)]">
            No public subscription or checkout
          </p>
        </div>
        <CardDescription>
          One finite subscription for toy sellers. The founding rate is public;
          live purchase stays closed until the single-Moment workflow is proven
          reliable and economically sustainable.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3 text-sm">
          {measuredBeforeOpen.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--mint)]/15 text-[var(--mint)]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="leading-snug text-[var(--fg-muted)]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto flex-col items-stretch gap-2">
        <Link
          href="/create?mode=moment&effect=street-power-up&source=pricing-preview&try=1&sample=beatbot"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--mint)] px-5 text-sm font-black text-black transition hover:opacity-95"
        >
          Preview one toy Moment
        </Link>
        <p className="text-center text-[10px] leading-relaxed text-[var(--fg-dim)]">
          Pikbo Lab samples only · no product-photo upload · no payment
        </p>
      </CardFooter>
    </Card>
  );
}
