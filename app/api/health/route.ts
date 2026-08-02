import { NextResponse } from "next/server";
import { probeEntitlementsStore } from "@/lib/entitlements";
import {
  durableExpireStaleReservations,
  durableServerOwnedJobsStatus,
} from "@/lib/durableCredits";
import { generationJobsProbe, jobTimeoutMs } from "@/lib/generationJobs";
import { paymentsReadiness } from "@/lib/stripe";
import { probeStripeBillingStore } from "@/lib/stripeBilling";
import { inflightJobCount, inflightTtlMs } from "@/lib/rateLimit";
import { localAssetsProbe } from "@/lib/localAssets";
import { probeDemoAssets } from "@/lib/demoClips";
import { communityUgcConfigured } from "@/lib/communityPosts";
import { imageJobsProbe } from "@/lib/imageJobs";
import { localReconciliationProbe } from "@/lib/durableCredits/localReconciliationJournal";
import { probeSoftLiveReadiness } from "@/lib/liveReadinessServer";
import {
  providerValidationBudgetUsd,
  providerValidationEnvironmentGate,
} from "@/lib/durableProviderBudget";
import {
  SELLER_PACK_LIVE_MODEL_ID,
  SELLER_PACK_LIVE_RESOLUTION,
} from "@/lib/models";
// NextResponse used for GET + HEAD

export const runtime = "nodejs";

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
  const [liveReadiness, stripeBillingStore] = await Promise.all([
    probeSoftLiveReadiness(),
    probeStripeBillingStore(),
  ]);
  const {
    authPublic,
    durableCredits,
    durableReconciliation,
    durableProviderBudget,
    privateInputAdmission,
    privatePreview,
    privateResults,
    supabase,
    t6,
    truth,
  } = liveReadiness;
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
  const payments = paymentsReadiness();
  const durableGate =
    process.env.REQUIRE_DURABLE_CREDITS === "1" && !durableCredits.writable;
  const durableServerOwnedJobs = durableServerOwnedJobsStatus();
  const {
    authConfigured,
    durableAtomicReservationConfigured,
    durableReconciliationConfigured,
    serverOwnedDeliverableConfigured,
  } = liveReadiness.input;

  /** Cached / validation / live ladders — honest gates for ops */
  const ready = {
    /** Cached Lab + Studio demo path (no provider key; free, no credit burn) */
    demo: true,
    mode: truth.mode,
    softLive: truth.softLive,
    provider: fal,
    auth: authConfigured,
    durableAtomicReservation: durableAtomicReservationConfigured,
    durableReconciliation: durableReconciliationConfigured,
    serverOwnedDeliverable: serverOwnedDeliverableConfigured,
    /**
     * Real charges — needs the service-role-only Supabase billing RPC.
     * Legacy JSON entitlements never satisfy this production gate.
     * Also requires Phase I test readiness (not live keys by accident).
     * Multi-node paid requires server-owned generation jobs (still hard-false).
     */
    paid:
      truth.softLive &&
      sessionSecret &&
      stripe &&
      stripeWebhook &&
      stripeBillingStore.backend === "supabase" &&
      stripeBillingStore.schemaReady &&
      stripeBillingStore.operatorReady &&
      durableCredits.writable &&
      payments.readyForTestCheckout &&
      durableServerOwnedJobs.effective,
    /** Only the Supabase atomic reservation path is live-spend authority. */
    durableCredits:
      durableAtomicReservationConfigured && durableReconciliationConfigured,
    /** Owner-only Preview path; independent from public Free/T6 readiness. */
    privatePreview: privatePreview.ready,
    /** Zero-Provider, invite-only private toy-photo admission. */
    privateInputAdmission: privateInputAdmission.ready,
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
      privatePreview: ready.privatePreview === true,
      missingPrivatePreviewRequirements: privatePreview.missing,
      privateInputAdmission: ready.privateInputAdmission === true,
      missingPrivateInputAdmissionRequirements: privateInputAdmission.missing,
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
    /**
     * R1a atomic generation ledger — source migration + smoke exist on main.
     * Applied=false until boss runs SQL in non-prod and probe sees RPCs.
     * Presence-only honesty (never claims multi-node ready from source alone).
     */
    recoveryLedger: {
      r1aAtomicRpcSource: true,
      migration:
        "supabase/migrations/20260727213000_r1_atomic_generation_credits.sql",
      smoke: "npm run recovery-ledger",
      appliedRequiresBoss: true,
      r1bRetryDeadlineSource: true,
      r1cReconciliationSource: true,
      r1cMigration:
        "supabase/migrations/20260727233000_r1c_generation_reconciliation.sql",
      r1cSmoke: "npm run recovery-reconciliation",
      r1cSchemaReady: durableReconciliation.schemaReady,
      r1cEnabledByOperator:
        process.env.PIKBO_R1_RECONCILIATION_READY === "1",
      /** Process-memory withhold journal (never delivers; no outputRef echo). */
      localJournal: localReconciliationProbe(),
      note:
        "R1a/R1c are source-only until migration preflight + non-prod rehearsal; live beta stays fail-closed without both schemas. localJournal holds process-memory withhold facts when SQL is off.",
    },
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
      /**
       * R1b: POST re-submit promotes a queued ledger-retry fork only when the
       * client sends explicit retryJobId (fork token). Never effect/prompt guess.
       */
      ledgerRetryPromote: "explicit-retryJobId-only",
      /** Process-memory open-job TIMEOUT is fixed from createdAt (touch does not extend). */
      jobDeadline: "fixed-from-createdAt",
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
        modelClass: ready.softLive ? SELLER_PACK_LIVE_MODEL_ID : null,
        durationSec: ready.softLive ? 5 : null,
        resolution: ready.softLive ? SELLER_PACK_LIVE_RESOLUTION : null,
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
    stripeBillingStore,
    durableCredits,
    durableProviderBudget,
    privateResults,
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
      stripeBillingSchemaReady: stripeBillingStore.schemaReady,
      stripeBillingOperatorReady: stripeBillingStore.operatorReady,
      durableCreditsWritable: durableCredits.writable,
      requireDurableCredits: process.env.REQUIRE_DURABLE_CREDITS === "1",
      atomicReservationOperatorReady:
        process.env.PIKBO_R1_ATOMIC_RESERVATION_READY === "1",
      reconciliationOperatorReady:
        process.env.PIKBO_R1_RECONCILIATION_READY === "1",
      supabaseConfigured: supabase.configured,
      supabaseServiceRole: supabase.hasServiceRole,
      authConfigured,
      durableAtomicReservationConfigured,
      durableReconciliationConfigured,
      serverOwnedDeliverableConfigured,
    },
    /**
     * Issue #54 private-beta live path (presence only — never allowlist emails).
     * Invited owner live still needs auth + durable reserve + provider.
     */
    privateLiveBeta: (() => {
      const enabled = process.env.PIKBO_PRIVATE_LIVE_ENABLED === "1";
      const allowlistConfigured = Boolean(
        (process.env.PIKBO_PRIVATE_LIVE_ALLOWLIST || "").trim()
      );
      const budgetMax = Math.max(
        0,
        Math.floor(Number(process.env.PIKBO_PRIVATE_LIVE_BUDGET_MAX || "0"))
      );
      return {
        enabled,
        allowlistConfigured,
        budgetMaxConfigured: budgetMax > 0,
        budgetMax: budgetMax > 0 ? budgetMax : 0,
        // Not ready until boss enables + allowlists + budget; runtime still needs auth/durable.
        notes: [
          "Set PIKBO_PRIVATE_LIVE_ENABLED=1 + ALLOWLIST + BUDGET_MAX for invited owner live",
          "Does not enable anonymous provider spend",
          "Private Preview results use owner-gated Pikbo storage; public Free/T6 remains closed",
        ],
      };
    })(),
    /** Non-production paid-provider admission (presence and ceiling only). */
    providerValidation: (() => {
      const deploymentGate = providerValidationEnvironmentGate();
      const requested =
        process.env.PIKBO_PROVIDER_VALIDATION_MODE === "1";
      const ceilingUsd = providerValidationBudgetUsd();
      return {
        requested,
        environment: deploymentGate.environment,
        previewOverride: deploymentGate.previewOverride,
        enabled: ceilingUsd > 0,
        ceilingUsd,
        durableBudgetSchemaReady: durableProviderBudget.schemaReady,
        durableBudgetRpcReady: durableProviderBudget.rpcReady,
        productionHardClosed: deploymentGate.productionHardClosed,
        note:
          "The database project-wide budget remains authoritative; this field never exposes keys, users, or remaining spend.",
      };
    })(),
    privatePreviewReadiness: {
      ready: privatePreview.ready,
      missing: privatePreview.missing,
    },
    privateInputAdmissionReadiness: {
      ready: privateInputAdmission.ready,
      missing: privateInputAdmission.missing,
      authorizes: "private-photo-upload-and-verification-only" as const,
      doesNotAuthorize: [
        "seller-pack-reserve",
        "provider-generation",
        "credit-settlement",
        "stripe",
      ] as const,
    },
    /** Live-readiness checklist (presence only — never echo secrets) */
    softLiveChecklist: {
      SESSION_SECRET: sessionSecret,
      FAL_KEY: fal,
      STRIPE_SECRET_KEY: stripe,
      STRIPE_WEBHOOK_SECRET: stripeWebhook,
      entitlementsWritable: entitlements.writable,
      STRIPE_BILLING_RPC_READY:
        stripeBillingStore.schemaReady && stripeBillingStore.operatorReady,
      AUTH_CONFIGURED: authConfigured,
      DURABLE_ATOMIC_RESERVATION_CONFIGURED:
        durableAtomicReservationConfigured,
      DURABLE_RECONCILIATION_CONFIGURED:
        durableReconciliationConfigured,
      PROVIDER_CONFIGURED: fal,
      SERVER_OWNED_DELIVERABLE_CONFIGURED:
        serverOwnedDeliverableConfigured,
      requiredForSoftLive: [
        "AUTH_CONFIGURED",
        "DURABLE_ATOMIC_RESERVATION_CONFIGURED",
        "DURABLE_RECONCILIATION_CONFIGURED",
        "PROVIDER_CONFIGURED",
        "SERVER_OWNED_DELIVERABLE_CONFIGURED",
      ],
      optionalUntilPaid: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_BILLING_RPC_READY",
      ],
      notes: [
        "Demo works without FAL_KEY (cached Lab clips, 0 credits)",
        "R0: anonymous + Free always cached demos; live needs auth + durable reserve RPC",
        "R1a: live reserve/capture/release uses pikbo_*_generation_v1 atomic RPCs (migration apply required)",
        "R1c: ambiguous provider outcomes remain withheld until a leased reconciliation worker confirms capture or release",
        "Provider and session secrets alone never make Soft Live ready",
        "Set PIKBO_R1_ATOMIC_RESERVATION_READY only after the reviewed RPC migration passes non-production integration",
        "Set PIKBO_R1_RECONCILIATION_READY only after the R1c migration and crash/race rehearsal pass in non-production",
        "Live requires configured auth, Supabase atomic reservation, durable reconciliation, provider, and server-owned delivery",
        "Paid later: rehearsed Supabase Stripe billing RPC + test Price IDs + signed webhook",
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
