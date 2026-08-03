"use client";

import { useState } from "react";

/**
 * High-intent Founding Studio capture — money path before Stripe keys land.
 * Honest: this is not payment; it reserves interest for $49 Founding when open.
 */
export function FoundingIntentForm({
  source = "pricing",
}: {
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/founding-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note, source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-xl border border-[var(--mint)]/35 bg-[var(--mint)]/10 px-4 py-3 text-sm font-semibold text-[var(--mint)]"
        data-founding-intent="saved"
      >
        Interest saved. We will open Founding Checkout as soon as billing is
        live — you will hear at this email.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-2"
      data-founding-intent="form"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mint)]">
        First money path · reserve Founding interest
      </p>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="you@shop.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[var(--mint)]/50"
      />
      <input
        type="text"
        maxLength={500}
        placeholder="Optional: shop / SKU volume (Etsy, TikTok Shop…)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[var(--mint)]/50"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--mint)] px-5 text-sm font-black text-black transition hover:opacity-95 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Reserve Founding access · $49/mo when open"}
      </button>
      {error ? (
        <p className="text-center text-xs text-[var(--brand)]">{error}</p>
      ) : (
        <p className="text-center text-[10px] leading-relaxed text-[var(--fg-dim)]">
          Not a charge. Stripe Checkout turns on when keys are connected —
          this queue is the buyer list.
        </p>
      )}
    </form>
  );
}
