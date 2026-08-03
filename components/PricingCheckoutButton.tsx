"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlanId } from "@/lib/pricing";
import { stripeBillingAuthHeaders } from "@/lib/stripeBillingClient";
import { Button } from "@/components/ui/button";

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

  // Validation mode: both the public flag and server acceptance must pass.
  if (!live && planId !== "free") {
    return (
      <div className="w-full">
        <Button
          asChild
          variant={featured ? "default" : "secondary"}
          size="lg"
          className="w-full"
        >
          <Link href="/create?mode=moment&effect=street-power-up&source=pricing-founding">
            Preview one Moment
          </Link>
        </Button>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--fg-dim)]">
          Checkout is closed while Stripe approval and private-beta quality
          gates are unfinished. The Moment preview is open now.
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
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
