import { NextResponse } from "next/server";
import { probeEntitlementsStore } from "@/lib/entitlements";
import {
  durableExpireStaleReservations,
  probeDurableCreditsStore,
} from "@/lib/durableCredits";
import { generateMode } from "@/lib/requestMeta";
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
  const mode = generateMode();
  const payments = paymentsReadiness();
  const durableGate =
    process.env.REQUIRE_DURABLE_CREDITS === "1" && !durableCredits.writable;

  /** Demo / soft-live / paid ladders — honest gates for ops */
  const ready = {
    /** Cached Lab + Studio demo path (no provider key; free, no credit burn) */
    demo: true,
    /** Live Mini/full Seedance when FAL_KEY + session secret present */
    softLive: fal && (sessionSecret || !production) && !durableGate,
    /**
     * Real charges — needs durable entitlements (PRELAUNCH R1).
     * File store unwritable ⇒ paid stays false even if Stripe env is set.
     * Also requires Phase I test readiness (not live keys by accident).
     */
    paid:
      fal &&
      sessionSecret &&
      stripe &&
      stripeWebhook &&
      entitlements.writable &&
      durableCredits.writable &&
      payments.readyForTestCheckout,
    /** T5 local adapter or Supabase — not live Stripe */
    durableCredits: durableCredits.writable && durableCredits.configured,
  };

  return NextResponse.json({
    ok: !degraded && !durableGate,
    degraded: degraded || durableGate,
    /**
     * Phase B honesty: demo-cached acceptance is independent of soft-live secrets.
     * Ops scripts default to accepting ready.demo; REQUIRE_SOFT_LIVE=1 for live.
     */
    acceptance: {
      demoCached: ready.demo === true,
      softLive: ready.softLive === true,
      paid: ready.paid === true,
    },
    /** T6 file watermark bake — blocked until operator proves pipeline */
    t6: t6Report(),
    /** Phase D local job timeout (ms) for queued/running sweep */
    jobTimeoutMs: jobTimeoutMs(),
    /** Phase I payments readiness (never echoes secrets) */
    payments,
    /** Local durable reservation TTL sweep since last probe */
    reservationSweep,
    service: "pikbo",
    foundation: "L0-L3",
    time: new Date().toISOString(),
    fal,
    stripe,
    stripeWebhook,
    sessionSecret,
    mode,
    /**
     * Product orientation — ops + Mode A honesty.
     * Primary sell is AI video; stills are optional support (not a stills shop).
     */
    product: {
      primary: "video" as const,
      stills: "optional-support" as const,
      generatePath: "/api/generate",
      imagePath: "/api/image",
      /** Generate + image both accept client-minted session-scoped keys. */
      idempotency: "client-key-session-scoped",
      imageIdempotency: "client-key-session-scoped",
    },
    /** Honesty contract: cached demos free; live jobs charge flat credits */
    billing: {
      cachedDemoCredits: 0,
      liveJobCredits: "flat CREDITS_PER_VIDEO",
      /** Product-level free trial caps (session-specific state lives on /api/me). */
      freeTrial: {
        planCredits: 10,
        clipsPerPeriod: 1,
        liveJobCredits: 10,
        modelClass: "seedance-mini",
        durationSec: 5,
        resolution: "480p",
        onPlayerMark: true,
        failedLiveRefunds: true,
        /** Free 10 credits = Create video Mini only — not Flux stills. */
        scope: "video-create-only",
        stillsOnFree: "demo-only",
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
      supabaseConfigured: supabase.configured,
      supabaseServiceRole: supabase.hasServiceRole,
    },
    /** Soft-live env checklist (presence only — never echo secrets) */
    softLiveChecklist: {
      SESSION_SECRET: sessionSecret,
      FAL_KEY: fal,
      STRIPE_SECRET_KEY: stripe,
      STRIPE_WEBHOOK_SECRET: stripeWebhook,
      entitlementsWritable: entitlements.writable,
      /** Soft launch (no Stripe) only needs the required pair. */
      requiredForSoftLive: ["SESSION_SECRET", "FAL_KEY"],
      optionalUntilPaid: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "entitlementsWritable",
      ],
      notes: [
        "Soft public (Sunday): SESSION_SECRET + FAL_KEY only — Stripe is Coming soon",
        "Demo works without FAL_KEY (cached Lab clips, 0 credits)",
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
