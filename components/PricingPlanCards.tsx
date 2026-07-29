"use client";

import { Check } from "lucide-react";
import { CREDITS_PER_VIDEO, PLANS, clipsFromCredits } from "@/lib/pricing";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
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
  return (
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
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
                    <Badge variant="brand">Validation candidate</Badge>
                  ) : plan.id === "free" ? (
                    <Badge variant="live">Start</Badge>
                  ) : null}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black tracking-tight">
                    ${plan.priceMonthly}
                  </span>
                  <span className="mb-1.5 text-sm text-[var(--fg-dim)]">
                    /mo
                  </span>
                </div>
                <CardDescription>{plan.blurb}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
                  <p className="text-3xl font-black tracking-tight">
                    {plan.id === "free"
                      ? "Preview"
                      : `${clipsFromCredits(plan.credits)} fixed`}
                    <span className="ml-1 text-base font-semibold text-[var(--fg-muted)]">
                      {plan.id === "free" ? "prototypes" : "videos"}
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fg-dim)]">
                    {plan.id === "free"
                      ? "0 credits · upload not processed"
                      : `${CREDITS_PER_VIDEO} credits per fixed 5s output`}
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
                      Preview sample · 0 credits · upload not processed
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
  );
}
