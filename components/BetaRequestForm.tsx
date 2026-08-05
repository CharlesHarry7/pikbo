"use client";

import { FormEvent, useState } from "react";
import { site } from "@/lib/site";

type State = "idle" | "submitting" | "success" | "error";

export function BetaRequestForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/beta/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          role: form.get("role"),
          shopUrl: form.get("shopUrl"),
          website: form.get("website"),
          consent: form.get("consent") === "on",
          sourcePath: window.location.pathname + window.location.search,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        duplicate?: boolean;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Could not submit the request.");
      }
      setState("success");
      setMessage(
        result.duplicate
          ? "You are already on the private-beta list."
          : "Request received. We will reply by email."
      );
      event.currentTarget.reset();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Could not submit the request."
      );
    }
  }

  if (state === "success") {
    return (
      <div
        className="mt-4 rounded-xl border border-[var(--mint)]/30 bg-[var(--mint)]/10 p-4 text-sm text-[var(--fg)]"
        role="status"
      >
        <p className="font-semibold">{message}</p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Private beta is invite-only. This is not a purchase.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
      <label className="block text-xs font-semibold text-[var(--fg-muted)]">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2.5 text-sm text-[var(--fg)] outline-none focus:border-[var(--mint)]"
          placeholder="you@shop.com"
        />
      </label>
      <label className="block text-xs font-semibold text-[var(--fg-muted)]">
        I am a
        <select
          name="role"
          required
          defaultValue="seller"
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none focus:border-[var(--mint)]"
        >
          <option value="seller">Designer-toy seller</option>
          <option value="studio">Toy studio / brand</option>
          <option value="collector">Collector / creator</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-xs font-semibold text-[var(--fg-muted)]">
        Shop link <span className="font-normal">(optional)</span>
        <input
          name="shopUrl"
          type="url"
          autoComplete="url"
          className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-black/10 px-3 py-2.5 text-sm text-[var(--fg)] outline-none focus:border-[var(--mint)]"
          placeholder="https://"
        />
      </label>
      {/* Honeypot — leave empty */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <label className="flex items-start gap-2 text-xs leading-5 text-[var(--fg-muted)]">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 accent-[var(--mint)]"
        />
        <span>
          I agree that Pikbo may use this information to review my beta request
          and contact me about access.
        </span>
      </label>
      <button
        type="submit"
        disabled={state === "submitting"}
        className="inline-flex min-h-11 items-center rounded-full bg-[var(--mint)] px-5 text-xs font-black text-black transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
      >
        {state === "submitting" ? "Sending…" : "Request private beta"}
      </button>
      {state === "error" ? (
        <p className="text-xs text-[#E85C45]" role="alert">
          {message} You can also email{" "}
          <a
            className="underline"
            href={`mailto:${site.contact.supportEmail}?subject=${encodeURIComponent("Pikbo private beta")}`}
          >
            {site.contact.supportEmail}
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
