"use client";

/**
 * US$49 Launch Pack honest order-intent surface.
 * Collects a complete owner-authorized brief in memory only.
 * Never opens checkout, marks paid/submitted, or calls a provider.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  LAUNCH_PACK_CHANNELS,
  LAUNCH_PACK_DELIVERABLES,
  LAUNCH_PACK_OFFER,
  LAUNCH_PACK_STYLES,
  evaluateLaunchPackOrderBrief,
  formatLaunchPackBriefForExport,
  launchPackBriefAnalyticsMeta,
  launchPackOfferAnalyticsMeta,
  launchPackPaymentDisclosure,
  type LaunchPackChannelId,
  type LaunchPackStyleId,
} from "@/lib/launchPackOrderIntent";

export function LaunchPackOrderIntent() {
  const [contactMethod, setContactMethod] = useState("");
  const [intendedChannel, setIntendedChannel] = useState<
    LaunchPackChannelId | ""
  >("");
  const [expectedStyle, setExpectedStyle] = useState<LaunchPackStyleId | "">(
    ""
  );
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [materialRightsConfirmed, setMaterialRightsConfirmed] = useState(false);
  const [orderImageConfirmed, setOrderImageConfirmed] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const briefStartedRef = useRef(false);
  const readyTrackedRef = useRef(false);

  const payment = launchPackPaymentDisclosure();
  const hasLocalImage = orderImageConfirmed;

  const evaluation = useMemo(
    () =>
      evaluateLaunchPackOrderBrief({
        contactMethod,
        hasLocalImage,
        materialRightsConfirmed,
        intendedChannel,
        expectedStyle,
        deliveryNotes,
      }),
    [
      contactMethod,
      hasLocalImage,
      materialRightsConfirmed,
      intendedChannel,
      expectedStyle,
      deliveryNotes,
    ]
  );

  useEffect(() => {
    track({
      event: "launch_pack_offer_view",
      path: "/create?mode=seller-pack",
      recipe: "launch-pack-49",
      meta: launchPackOfferAnalyticsMeta(),
    });
  }, []);

  useEffect(() => {
    if (evaluation.complete) {
      if (!readyTrackedRef.current) {
        readyTrackedRef.current = true;
        track({
          event: "launch_pack_brief_ready",
          path: "/create?mode=seller-pack",
          recipe: "launch-pack-49",
          meta: launchPackBriefAnalyticsMeta(evaluation),
        });
      }
      return;
    }
    readyTrackedRef.current = false;
  }, [evaluation]);

  const markBriefStart = useCallback(() => {
    if (briefStartedRef.current) return;
    briefStartedRef.current = true;
    track({
      event: "launch_pack_brief_start",
      path: "/create?mode=seller-pack",
      recipe: "launch-pack-49",
      meta: launchPackOfferAnalyticsMeta(),
    });
  }, []);

  function exportText() {
    return formatLaunchPackBriefForExport({
      contactMethod,
      intendedChannel,
      expectedStyle,
      deliveryNotes,
      materialRightsConfirmed,
      hasLocalImage,
      evaluatedAt: new Date().toISOString(),
    });
  }

  async function handleCopyBrief() {
    const text = exportText();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyFeedback("Brief copied on this device. Nothing was submitted.");
        return;
      }
    } catch {
      // fall through
    }
    setCopyFeedback(
      "Clipboard unavailable — use Download brief instead. Nothing was submitted."
    );
  }

  function handleDownloadBrief() {
    const text = exportText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pikbo-launch-pack-order-brief.txt";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setCopyFeedback(
      "Brief downloaded on this device. No order was sent and payment is not open."
    );
  }

  const statusLabel =
    evaluation.status === "ready_for_manual_review"
      ? "Ready for manual review"
      : "Draft";

  return (
    <section
      className="mt-6 overflow-x-hidden rounded-2xl border border-[var(--mint)]/30 bg-gradient-to-br from-[var(--mint)]/[0.08] via-black/50 to-black/70 p-3.5 sm:p-5"
      data-launch-pack-order-intent="us49"
      data-launch-pack-payment="not-open"
      data-launch-pack-brief-status={evaluation.status}
      aria-labelledby="launch-pack-order-intent-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]">
            One-time service · owner-authorized SKU
          </p>
          <h2
            id="launch-pack-order-intent-title"
            className="mt-1 font-display text-xl font-black uppercase tracking-tight text-white sm:text-2xl"
          >
            {LAUNCH_PACK_OFFER.label}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/65">
            {LAUNCH_PACK_OFFER.blurb} Prepare a complete brief now; ordering
            stays manual until payment opens.
          </p>
        </div>
        <div
          className="shrink-0 rounded-xl border border-[var(--mint)]/40 bg-black/50 px-3 py-2 text-right"
          data-launch-pack-price="49"
        >
          <p className="font-display text-2xl font-black text-[var(--mint)]">
            US${LAUNCH_PACK_OFFER.priceUsd}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
            one-time · not checkout
          </p>
        </div>
      </div>

      <ul
        className="mt-4 grid gap-2 sm:grid-cols-3"
        data-launch-pack-deliverables="fixed-trio"
      >
        {LAUNCH_PACK_DELIVERABLES.map((item, index) => (
          <li
            key={item.key}
            className="min-w-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5"
          >
            <span className="text-[10px] font-black text-[var(--mint)]">
              0{index + 1}
            </span>
            <p className="mt-0.5 text-xs font-bold text-white">
              {item.commercialLabel}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-white/45">
              Uses fixed recipe {item.contractLabel} ({item.aspectRatio}) · not
              a claim that cached Lab demos are your SKU
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-white/55">
        <span
          className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1"
          data-launch-pack-delivery-hours="24"
        >
          {LAUNCH_PACK_OFFER.deliveryTargetHours}-hour delivery target
        </span>
        <span
          className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1"
          data-launch-pack-revisions="1"
        >
          {LAUNCH_PACK_OFFER.revisionsIncluded} revision included
        </span>
        <span
          className="rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-2.5 py-1 text-amber-100"
          data-launch-pack-status-chip={payment.status}
        >
          Payment is not open yet
        </span>
        <span
          className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1"
          data-launch-pack-status-chip={evaluation.status}
        >
          Brief: {statusLabel}
        </span>
      </div>

      <p
        className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-50/90"
        data-launch-pack-payment-disclosure="closed"
      >
        <strong className="font-bold">Payment is not open yet.</strong>{" "}
        {payment.detail} Completing this brief does not charge a card, open
        Stripe, mark an order paid, or start production.
      </p>

      <div
        className="mt-5 space-y-3"
        data-launch-pack-brief-form="memory-only"
        onFocusCapture={markBriefStart}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">
          Order brief · stays in this browser until you copy or download
        </p>

        <label className="block min-w-0">
          <span className="text-[11px] font-semibold text-white/70">
            Contact method{" "}
            <span className="font-normal text-white/40">
              (email, Telegram, WeChat, etc.)
            </span>
          </span>
          <input
            type="text"
            name="launch-pack-contact"
            autoComplete="off"
            inputMode="text"
            value={contactMethod}
            onChange={(e) => {
              markBriefStart();
              setContactMethod(e.target.value.slice(0, 200));
            }}
            placeholder="How should the owner reach you?"
            className="mt-1 w-full min-w-0 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--mint)]/50 focus:outline-none"
            data-launch-pack-field="contactMethod"
          />
        </label>

        <label
          className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/12 bg-black/35 px-3 py-2.5 text-[12px] leading-snug text-white/75"
          data-launch-pack-field="localImage"
        >
          <input
            type="checkbox"
            checked={orderImageConfirmed}
            onChange={(e) => {
              markBriefStart();
              setOrderImageConfirmed(e.target.checked);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--mint)]"
          />
          <span>
            Use the owned toy photo selected once in the Create studio above as
            this order&apos;s source image. This brief never uploads or copies
            the image a second time.
          </span>
        </label>

        <label
          className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/12 bg-black/35 px-3 py-2.5 text-[12px] leading-snug text-white/75"
          data-launch-pack-field="materialRights"
        >
          <input
            type="checkbox"
            checked={materialRightsConfirmed}
            onChange={(e) => {
              markBriefStart();
              setMaterialRightsConfirmed(e.target.checked);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--mint)]"
          />
          <span>
            I own or am authorized to use this toy photo, brand marks, character,
            packaging, and resulting media for commercial launch assets. Pikbo
            does not grant third-party IP rights.
          </span>
        </label>

        <label className="block min-w-0" data-launch-pack-field="intendedChannel">
          <span className="text-[11px] font-semibold text-white/70">
            Intended channel
          </span>
          <select
            value={intendedChannel}
            onChange={(e) => {
              markBriefStart();
              setIntendedChannel(
                (e.target.value || "") as LaunchPackChannelId | ""
              );
            }}
            className="mt-1 w-full min-w-0 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-[var(--mint)]/50 focus:outline-none"
          >
            <option value="">Select primary channel…</option>
            {LAUNCH_PACK_CHANNELS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0" data-launch-pack-field="expectedStyle">
          <span className="text-[11px] font-semibold text-white/70">
            Expected style
          </span>
          <select
            value={expectedStyle}
            onChange={(e) => {
              markBriefStart();
              setExpectedStyle(
                (e.target.value || "") as LaunchPackStyleId | ""
              );
            }}
            className="mt-1 w-full min-w-0 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-[var(--mint)]/50 focus:outline-none"
          >
            <option value="">Select style direction…</option>
            {LAUNCH_PACK_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0" data-launch-pack-field="deliveryNotes">
          <span className="text-[11px] font-semibold text-white/70">
            Delivery notes
          </span>
          <textarea
            value={deliveryNotes}
            onChange={(e) => {
              markBriefStart();
              setDeliveryNotes(e.target.value.slice(0, 2000));
            }}
            rows={3}
            placeholder="SKU name, must-keep details, drop date, caption language, packaging notes…"
            className="mt-1 w-full min-w-0 resize-y rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--mint)]/50 focus:outline-none"
          />
        </label>
      </div>

      <div
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        data-launch-pack-primary-row="order-intent"
      >
        <button
          type="button"
          disabled={!evaluation.complete}
          onClick={() => {
            // Honest primary action: no submit, no pay — surface next-step truth.
            setCopyFeedback(evaluation.nextStepMessage);
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--mint)] px-5 py-2.5 text-sm font-black text-black shadow-[0_0_24px_rgba(200,255,61,0.22)] transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          data-launch-pack-primary-action="prepare-brief"
        >
          {evaluation.complete
            ? "Mark brief ready for manual review"
            : "Complete brief to continue"}
        </button>
        <p
          className="text-[11px] font-semibold leading-snug text-amber-100/90 sm:max-w-xs"
          data-launch-pack-payment-beside-cta="not-open"
        >
          Payment is not open yet · no charge · no Stripe
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void handleCopyBrief()}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:border-white/40"
          data-launch-pack-export="copy-brief"
        >
          Copy brief
        </button>
        <button
          type="button"
          onClick={handleDownloadBrief}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:border-white/40"
          data-launch-pack-export="download-brief"
        >
          Download brief
        </button>
      </div>

      <p
        className="mt-3 text-[11px] leading-relaxed text-white/55"
        data-launch-pack-next-step="intake-unconfigured"
        data-launch-pack-brief-complete={evaluation.complete ? "true" : "false"}
      >
        {evaluation.nextStepMessage} No owner intake endpoint is configured in
        this build — use Copy or Download to keep your brief on this device.
      </p>
      {copyFeedback ? (
        <p
          className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-white/75"
          data-launch-pack-export-feedback="local-only"
          role="status"
        >
          {copyFeedback}
        </p>
      ) : null}
      {!evaluation.complete && evaluation.missing.length > 0 ? (
        <p className="mt-2 text-[10px] text-white/40">
          Still needed: {evaluation.missing.join(", ")}
        </p>
      ) : null}
    </section>
  );
}
