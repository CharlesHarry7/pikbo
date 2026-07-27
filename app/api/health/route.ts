import { NextResponse } from "next/server";
import { probeEntitlementsStore } from "@/lib/entitlements";
import {
  durableExpireStaleReservations,
  durableServerOwnedJobsStatus,
  probeDurableCreditsStore,
} from "@/lib/durableCredits";
import { probeSupabase } from "@/lib/supabase/server";
import { publicAuthStatus } from "@/lib/authConfig";
import { t6Report } from "@/lib/t6Watermark";
import { generationJobsProbe, jobTimeoutMs } from "@/lib/generationJobs";
import { paymentsReadiness } from "@/lib/stripe";
import { inflightJobCount, inflightTtlMs } from "@/lib/rateLimit";
import { localAssetsProbe } from "@/lib/localAssets";
import { probeDemoAssets } from "@/lib/demoClips";
import { communityUgcConfigured } from "@/lib/communityPosts";
import { imageJobsProbe } from "@/lib/imageJobs";
// NextResponse used for GET + HEAD

export const runtime = "nodejs";

type HealthTruthInput = {
  authConfigured: boolean;
  durableAtomicReservationConfigured: boolean;
  providerConfigured: boolean;
  serverOwnedDeliverableConfigured: boolean;
};

/**
 * Public live-readiness contract. Every prerequisite is mandatory; environment
 * presence or a provider key alone must never advertise live generation.
 */
function evaluateHealthTruth(input: HealthTruthInput) {
  const missing: Array<keyof HealthTruthInput> = [];
  if (!input.authConfigured) missing.push("authConfigured");
  if (!input.durableAtomicReservationConfigured) {
    missing.push("durableAtomicReservationConfigured");
  }
  if (!input.providerConfigured) missing.push("providerConfigured");
  if (!input.serverOwnedDeliverableConfigured) {
    missing.push("serverOwnedDeliverableConfigured");
  }
  const softLive = missing.length === 0;
  return {
    softLive,
    mode: softLive
      ? ("live-generate" as const)
      : input.providerConfigured
        ? ("validation" as const)
        : ("cached-only" as const),
    missing,
  };
}

/** Uptime probes that only need a 200 without JSON body. */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Lightweight health for ops / uptime checks — foundation L0 + soft-launch readiness */
export async function GET() {
  const fal = Boolean(process.env.FAL_KEY);
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const sessionSecret = Boolean(
    process.env.SESSION_SECRET || process.env.CREDITS_SECRET
  );
  const production = process.env.NODE_ENV === "production";
  const degraded = production && !sessionSecret;

  const entitlements = await probeEntitlementsStore();
  const durableCredits = await probeDurableCreditsStore();
  // Best-effort local reservation TTL sweep (no-op on Supabase backend)
  let reservationSweep = {
    expired: 0,
    releasedCredits: 0,
    backend: "skipped" as string,
  };
  try {
    reservationSweep = await durableExpireStaleReservations();
  } catch {
    /* never break health */
  }
  const supabase = await probeSupabase();
  const authPublic = publicAuthStatus();
  const payments = paymentsReadiness();
  const durableGate =
    process.env.REQUIRE_DURABLE_CREDITS === "1" && !durableCredits.writable;
  const durableServerOwnedJobs = durableServerOwnedJobsStatus();
  const t6 = t6Report();

  const authConfigured =
    authPublic.configured && supabase.configured && supabase.reachable;
  const durableAtomicReservationConfigured =
    process.env.REQUIRE_DURABLE_CREDITS === "1" &&
    process.env.PIKBO_R1_ATOMIC_RESERVATION_READY === "1" &&
    durableCredits.backend === "supabase" &&
    durableCredits.configured &&
    durableCredits.writable &&
    durableCredits.schemaReady === true &&
    supabase.hasServiceRole;
  const serverOwnedDeliverableConfigured =
    t6.status === "ready" &&
    t6.fileBake === true &&
    t6.freeLiveRawDownload === "allowed" &&
    t6.tooling.serverOwnedWorkerReady &&
    t6.tooling.derivativeServingImplemented &&
    t6.tooling.storageAdapterImplemented;
  const truth = evaluateHealthTruth({
    authConfigured,
    durableAtomicReservationConfigured,
    providerConfigured: fal,
    serverOwnedDeliverableConfigured,
  });

  /** Cached / validation / live ladders — honest gates for ops */
  const ready = {
    /** Cached Lab + Studio demo path (no provider key; free, no credit burn) */
    demo: true,
    mode: truth.mode,
    softLive: truth.softLive,
    provider: fal,
    auth: authConfigured,
    durableAtomicReservation: durableAtomicReservationConfigured,
    serverOwnedDeliverable: serverOwnedDeliverableConfigured,
    /**
     * Real charges — needs durable entitlements (PRELAUNCH R1).
     * File store unwritable ⇒ paid stays false even if Stripe env is set.
     * Also requires Phase I test readiness (not live keys by accident).
     * Multi-node paid requires server-owned generation jobs (still hard-false).
     */
    paid:
      truth.softLive &&
      sessionSecret &&
      stripe &&
      stripeWebhook &&
      entitlements.writable &&
      durableCredits.writable &&
      payments.readyForTestCheckout &&
      durableServerOwnedJobs.effective,
    /** Only the Supabase atomic reservation path is live-spend authority. */
    durableCredits: durableAtomicReservationConfigured,
  };

  return NextResponse.json({
    ok: !degraded && !durableGate,
    degraded: degraded || durableGate,
    /**
     * Phase B honesty: demo-cached acceptance is independent of soft-live secrets.
     * Ops scripts default to accepting ready.demo; REQUIRE_SOFT_LIVE=1 for live.
     */
    acceptance: {
      mode: truth.mode,
      demoCached: ready.demo === true,
      validation: truth.mode === "validation",
      softLive: ready.softLive === true,
      paid: ready.paid === true,
      missingLiveRequirements: truth.missing,
    },
    /** T6 file watermark bake — blocked until operator proves pipeline */
    t6,
    /** Phase D local job timeout (ms) for queued/running sweep */
    jobTimeoutMs: jobTimeoutMs(),
    /** Phase I payments readiness (never echoes secrets) */
    payments,
    /** Local durable reservation TTL sweep since last probe */
    reservationSweep,
    /**
     * T5 server-owned generation jobs — env request never enables without
     * SERVER_OWNED_GENERATION_JOBS_IMPLEMENTED=true (still hard-false).
     */
    durableServerOwnedJobs,
    durableCreditsBackendNote:
      "local-file is single-node verification only; multi-node accounting needs Supabase RPCs + server-owned jobs",
    service: "pikbo",
    foundation: "L0-L3",
    time: new Date().toISOString(),
    fal,
    stripe,
    stripeWebhook,
    sessionSecret,
    mode: truth.mode,
    /**
     * Product orientation — ops + Mode A honesty.
     * Primary sell is AI video; stills are optional support (not a stills shop).
     */
    product: {
      primary: "video" as const,
      stills: "optional-support" as const,
      generatePath: "/api/generate",
      imagePath: "/api/image",
      /** Single still poll + touch (parity GET /api/generations/[id]). */
      imageJobStatus: "/api/image/[id]",
      /** Ledger retry fork (parity POST /api/generations/[id]/retry). */
      imageRetry: "POST /api/image/[id]/retry",
      /** Generate + image both accept client-minted session-scoped keys. */
      idempotency: "client-key-session-scoped",
      imageIdempotency: "client-key-session-scoped",
      /** Ledger cancel (soft-launch; does not kill provider mid-flight). */
      cancelGenerate: "DELETE /api/generations",
      cancelImage: "DELETE /api/image or DELETE /api/image/[id]",
      /** POST re-submit promotes matching queued ledger-retry forks. */
      ledgerRetryPromote: "queued-fork-same-effect-or-prompt",
      downloadGate: "/api/downloads/{jobId|requestId}",
    },
    /** Honesty contract: cached demos free; live jobs charge flat credits */
    billing: {
      cachedDemoCredits: 0,
      liveJobCredits: ready.softLive ? "flat CREDITS_PER_VIDEO" : null,
      /** Product-level free trial caps (session-specific state lives on /api/me). */
      freeTrial: {
        available: ready.softLive,
        planCredits: ready.softLive ? 10 : 0,
        clipsPerPeriod: ready.softLive ? 1 : 0,
        liveJobCredits: ready.softLive ? 10 : null,
        modelClass: ready.softLive ? "seedance-mini" : null,
        durationSec: ready.softLive ? 5 : null,
        resolution: ready.softLive ? "480p" : null,
        onPlayerMark: ready.softLive,
        /**
         * Recoverable provider/validation fails restore the debit when the
         * server confirms. Keep boolean true for Mode A ops gates.
         */
        failedLiveRefunds: ready.softLive,
        /** Ops honesty — not every fail is a confirmed restore. */
        failedLiveRefundPolicy: "when_confirmed" as const,
        /** Process kill / ledger TIMEOUT → refund unconfirmed (check balance). */
        ledgerTimeoutRefund: "unconfirmed" as const,
        /** Soft-launch cancel never invents restore. */
        ledgerCancelRefund: "unconfirmed" as const,
        /** Free 10 credits = Create video Mini only — not Flux stills. */
        scope: ready.softLive ? "video-create-only" : "cached-demo-only",
        stillsOnFree: "demo-only",
        reason: ready.softLive
          ? "All live prerequisites are configured"
          : "Free live is closed; cached Pikbo Lab prototypes only",
      },
    },
    rateLimit: {
      summary: "session-8rpm + ip-24rpm + inflight-1",
      /** Active generate/image locks on this process (stale locks auto-expire). */
      inflight: inflightJobCount(),
      inflightTtlMs: inflightTtlMs(),
    },
    /** Phase D process-memory still registry (never echoes image bytes) */
    assets: localAssetsProbe(),
    /**
     * Cached Lab mp4 + one-click sample stills on this host (Mode A ops).
     * Demo generate + homepage walls need these files — missing ⇒ player 404.
     */
    demos: probeDemoAssets(),
    /**
     * Real community UGC (Supabase). Never invent posts when empty —
     * UI must show Lab only (labOnly honesty).
     */
    community: {
      ugcConfigured: communityUgcConfigured(),
      note: "Real posts only when Supabase + migration applied; empty = Lab only",
    },
    /** Phase D process-memory job ledger (counts only) */
    jobs: generationJobsProbe(),
    /** Still studio process-memory ledger (counts only — no image bytes) */
    imageJobs: imageJobsProbe(),
    /**
     * Provider webhook auth readiness (presence only — never echo secret).
     * Production refuses unsigned POSTs when secret missing.
     */
    videoWebhook: {
      secretConfigured: Boolean(
        (process.env.VIDEO_PROVIDER_WEBHOOK_SECRET || "").trim()
      ),
      requiresSecretInProduction: true,
    },
    ready,
    entitlements,
    durableCredits,
    auth: {
      mode: authPublic.mode,
      configured: authPublic.configured,
      providers: authPublic.providers,
      supabase: {
        configured: supabase.configured,
        reachable: supabase.reachable,
        hasServiceRole: supabase.hasServiceRole,
        error: supabase.error,
      },
    },
    checks: {
      sessionSecret,
      fal,
      stripe,
      stripeWebhook,
      production,
      entitlementsWritable: entitlements.writable,
      durableCreditsWritable: durableCredits.writable,
      requireDurableCredits: process.env.REQUIRE_DURABLE_CREDITS === "1",
      atomicReservationOperatorReady:
        process.env.PIKBO_R1_ATOMIC_RESERVATION_READY === "1",
      supabaseConfigured: supabase.configured,
      supabaseServiceRole: supabase.hasServiceRole,
      authConfigured,
      durableAtomicReservationConfigured,
      serverOwnedDeliverableConfigured,
    },
    /** Live-readiness checklist (presence only — never echo secrets) */
    softLiveChecklist: {
      SESSION_SECRET: sessionSecret,
      FAL_KEY: fal,
      STRIPE_SECRET_KEY: stripe,
      STRIPE_WEBHOOK_SECRET: stripeWebhook,
      entitlementsWritable: entitlements.writable,
      AUTH_CONFIGURED: authConfigured,
      DURABLE_ATOMIC_RESERVATION_CONFIGURED:
        durableAtomicReservationConfigured,
      PROVIDER_CONFIGURED: fal,
      SERVER_OWNED_DELIVERABLE_CONFIGURED:
        serverOwnedDeliverableConfigured,
      requiredForSoftLive: [
        "AUTH_CONFIGURED",
        "DURABLE_ATOMIC_RESERVATION_CONFIGURED",
        "PROVIDER_CONFIGURED",
        "SERVER_OWNED_DELIVERABLE_CONFIGURED",
      ],
      optionalUntilPaid: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "entitlementsWritable",
      ],
      notes: [
        "Demo works without FAL_KEY (cached Lab clips, 0 credits)",
        "Provider and session secrets alone never make Soft Live ready",
        "Set PIKBO_R1_ATOMIC_RESERVATION_READY only after the reviewed RPC migration passes non-production integration",
        "Live requires configured auth, Supabase atomic reservation, provider, and server-owned delivery",
        "Paid later: durable entitlements + Stripe price IDs + webhook",
        "PIKBO_FORCE_GENERATE_FAIL is ops-only and hard-off in production",
        "See docs/LAUNCH.md",
      ],
    },
    devTopup:
      process.env.NODE_ENV === "development" ||
      (process.env.VERCEL_ENV !== "production" &&
        process.env.NODE_ENV !== "production" &&
        process.env.PIKBO_DEV_TOPUP === "1"),
    /**
     * G6 ops: force-fail refund path. Never true on production hosts.
     * Presence only — does not echo other secrets.
     */
    forceGenerateFail:
      process.env.PIKBO_FORCE_GENERATE_FAIL === "1" &&
      process.env.NODE_ENV !== "production" &&
      process.env.VERCEL_ENV !== "production",
    video: {
      free:
        process.env.FAL_MODEL_FREE ||
        "bytedance/seedance-2.0/mini/image-to-video",
      paid: process.env.FAL_MODEL || "bytedance/seedance-2.0/image-to-video",
      fast:
        process.env.FAL_MODEL_FAST ||
        "bytedance/seedance-2.0/fast/image-to-video",
    },
    image: process.env.FAL_IMAGE_MODEL || "fal-ai/flux/schnell",
  });
}
