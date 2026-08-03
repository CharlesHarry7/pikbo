"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { FoundingIntentForm } from "@/components/FoundingIntentForm";
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
 * Money path: Founding Studio intent capture now; Stripe Checkout when keys land.
 * Target offer: $49/mo Founding Studio for toy sellers (not live-charged yet).
 */
export function PricingPlanCards() {
  const measuredBeforeOpen = [
    "One directed toy Moment → listing / TikTok / drop clips",
    "Private Library delivery and owner-only downloads",
    "Founding price target: $49/mo when Stripe Checkout is connected",
    "Card checkout opens the moment Stripe keys are wired (not fake-paid)",
  ];

  return (
    <Card
      id="plan-founding_studio"
      className="relative mx-auto flex max-w-2xl scroll-mt-24 flex-col overflow-hidden border-[var(--mint)]/40 shadow-[0_0_0_1px_rgba(200,255,61,0.2),0_24px_60px_-24px_rgba(0,0,0,0.85)]"
      data-pricing-state="founding-intent"
    >
      <div className="absolute inset-x-0 top-0 h-1 [background:var(--grad)]" />
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Founding Studio</CardTitle>
          <Badge variant="brand">$49/mo · reserve interest</Badge>
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">$49<span className="text-lg font-bold text-[var(--fg-dim)]">/mo</span></p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.13em] text-[var(--fg-dim)]">
            Target founding price · card checkout pending Stripe keys
          </p>
        </div>
        <CardDescription>
          Designer-toy video suite for sellers who need listing and social clips
          from one owned photo — the paid path to make Pikbo earn.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
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
        <FoundingIntentForm source="pricing" />
      </CardContent>

      <CardFooter className="mt-auto flex-col items-stretch gap-2">
        <Link
          href="/create?effect=360-spin-showcase&source=pricing-generate"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-black text-white transition hover:border-[var(--mint)]/45"
        >
          Generate a toy clip first
        </Link>
        <p className="text-center text-[10px] leading-relaxed text-[var(--fg-dim)]">
          Interest list is free · card charge only after Stripe is connected
        </p>
      </CardFooter>
    </Card>
  );
}
