"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CREDITS_PER_VIDEO, PLANS, clipsFromCredits } from "@/lib/pricing";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Template-grade pricing grid (shadcn Card kit + existing checkout). */
export function PricingPlanCards() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className="mb-10 flex justify-center">
        <div
          className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-soft)] p-1 text-sm shadow-[var(--shadow-sm)]"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              !annual
                ? "bg-[var(--card)] text-[var(--fg)] shadow-sm"
                : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              annual
                ? "bg-[var(--card)] text-[var(--fg)] shadow-sm"
                : "text-[var(--fg-dim)] hover:text-[var(--fg)]"
            )}
          >
            Annual{" "}
            <span className="ml-1 text-[var(--mint)]">−20%</span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = annual
            ? Math.round(plan.priceMonthly * 0.8)
            : plan.priceMonthly;
          return (
            <Card
              key={plan.id}
              id={`plan-${plan.id}`}
              className={cn(
                "relative flex scroll-mt-24 flex-col overflow-hidden transition-transform hover:-translate-y-0.5",
                plan.featured &&
                  "z-[1] border-[var(--mint)]/40 shadow-[0_0_0_1px_rgba(200,255,61,0.2),0_24px_60px_-24px_rgba(0,0,0,0.85)] md:scale-[1.02]"
              )}
            >
              {plan.featured && (
                <div className="absolute inset-x-0 top-0 h-1 [background:var(--grad)]" />
              )}
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.featured ? (
                    <Badge variant="brand">Current allowance</Badge>
                  ) : plan.id === "free" ? (
                    <Badge variant="live">Start</Badge>
                  ) : null}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black tracking-tight">
                    ${price}
                  </span>
                  <span className="mb-1.5 text-sm text-[var(--fg-dim)]">
                    /{annual && plan.priceMonthly > 0 ? "mo yearly" : "mo"}
                  </span>
                </div>
                {annual && plan.priceMonthly > 0 && (
                  <p className="text-xs font-medium text-[var(--mint)]">
                    ${Math.round(plan.priceMonthly * 12 * 0.8)}/yr · save 20%
                  </p>
                )}
                <CardDescription>{plan.blurb}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
                  <p className="text-3xl font-black tracking-tight">
                    ≈ {clipsFromCredits(plan.credits)}
                    <span className="ml-1 text-base font-semibold text-[var(--fg-muted)]">
                      clips
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                    {CREDITS_PER_VIDEO} credits per current job · weighted rates next
                  </p>
                </div>
                <ul className="space-y-2.5 text-sm">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--mint)]/15 text-[var(--mint)]">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-[var(--fg-muted)] leading-snug">
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="mt-auto flex-col items-stretch gap-2">
                {plan.id === "free" ? (
                  <>
                    <FreeTrialCta
                      path="/pricing#plans"
                      labelTry={plan.cta}
                      labelDemo="Try Lab sample"
                      labelPlans="Compare plans"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--mint)] px-5 text-sm font-black text-black transition hover:opacity-95"
                    />
                    <p className="text-center text-[10px] text-[var(--fg-dim)]">
                      Lab sample free · Free Mini 5s when trial left · exhausted →
                      plans
                    </p>
                  </>
                ) : annual ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="w-full cursor-not-allowed opacity-60"
                      disabled
                      title="Annual Stripe prices not wired yet"
                    >
                      Annual soon — use Monthly
                    </Button>
                    <p className="text-center text-[10px] text-[var(--fg-dim)]">
                      Checkout is monthly today. Yearly Stripe prices ship later.
                    </p>
                  </>
                ) : (
                  <PricingCheckoutButton
                    planId={plan.id}
                    label={plan.cta}
                    featured={plan.featured}
                  />
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </>
  );
}
