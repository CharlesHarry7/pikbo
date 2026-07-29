"use client";

import { useState } from "react";
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
  const live = paymentsLive();

  // Validation mode: never pretend the paid candidate is buyable.
  if (!live && planId !== "free") {
    return (
      <div className="w-full">
        <Button
          type="button"
          disabled
          variant={featured ? "default" : "secondary"}
          size="lg"
          className="w-full opacity-70"
        >
          Coming soon
        </Button>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--fg-dim)]">
          Cached prototypes are open. Founding Studio remains unavailable until
          quality, accounting, privacy, and target-buyer gates pass.
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
