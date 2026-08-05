"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlanId } from "@/lib/pricing";
import { stripeBillingAuthHeaders } from "@/lib/stripeBillingClient";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { Button } from "@/components/ui/button";

const PRICING_FOUNDING_HREF =
  `${MOMENT_CREATE_HREF}&source=pricing-founding` as const;
const PRICING_LOGIN_HREF = `/login?next=${encodeURIComponent("/pricing")}` as const;

/** Soft launch: paid checkout only when explicitly enabled + Stripe configured. */
function paymentsLive(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "1";
}

export function PricingCheckoutButton({
  planId,
  label,
  featured,
}: {
  planId: PlanId;
  label: string;
  featured?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientEnabled = paymentsLive();
  const [serverAccepted, setServerAccepted] = useState(false);
  const live = clientEnabled && serverAccepted;

  useEffect(() => {
    if (!clientEnabled) return;
    let canceled = false;
    void fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const data = (await response.json()) as {
          acceptance?: { paid?: boolean; privatePreview?: boolean };
          payments?: { readyForTestCheckout?: boolean };
        };
        return (
          data.acceptance?.paid === true ||
          (data.acceptance?.privatePreview === true &&
            data.payments?.readyForTestCheckout === true)
        );
      })
      .then((accepted) => {
        if (!canceled) setServerAccepted(accepted);
      })
      .catch(() => {
        if (!canceled) setServerAccepted(false);
      });
    return () => {
      canceled = true;
    };
  }, [clientEnabled]);

  // Closed billing: no keys / no acceptance → never create a Checkout Session.
  // Intent path only (preview or waitlist); live Stripe stays hard-gated.
  if (!live && planId !== "free") {
    return (
      <div className="w-full" data-billing-cta="closed-intent">
        <Button
          asChild
          variant={featured ? "default" : "secondary"}
          size="lg"
          className="w-full"
        >
          <Link href={PRICING_FOUNDING_HREF}>
            Preview one Moment
          </Link>
        </Button>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--fg-dim)]">
          Checkout is closed — no live Stripe charge without keys and gates.
          Preview a Moment now, or leave founding intent on Contact.
        </p>
      </div>
    );
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const headers = await stripeBillingAuthHeaders();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: planId }),
      });
      const data = (await res.json()) as {
        code?: string;
        error?: string;
        url?: string;
      };
      if (data.code === "AUTH_REQUIRED") {
        window.location.assign(PRICING_LOGIN_HREF);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "Sign in before subscribing."
      ) {
        window.location.assign(PRICING_LOGIN_HREF);
        return;
      }
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        onClick={checkout}
        disabled={busy}
        variant={featured ? "default" : "secondary"}
        size="lg"
        className="w-full"
      >
        {busy ? "Redirecting…" : label}
      </Button>
      {error && (
        <p className="mt-2 text-center text-xs text-[var(--brand)]">{error}</p>
      )}
    </div>
  );
}
