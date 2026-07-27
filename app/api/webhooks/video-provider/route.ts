import { NextResponse } from "next/server";
import {
  applyProviderWebhookEvent,
  toPublicJob,
} from "@/lib/generationJobs";

export const runtime = "nodejs";

type WebhookBody = {
  eventId?: string;
  /** Alias used by some providers */
  id?: string;
  requestId?: string;
  jobId?: string;
  status?: string;
  videoUrl?: string;
  error?: string;
  errorCode?: string;
  demo?: boolean;
  watermark?: boolean;
  model?: string;
  provider?: string;
};

/**
 * Phase D — provider completion webhook (idempotent).
 * Soft-launch still settles most jobs inline on /api/generate.
 * This route records async outcomes + dedupes retries by eventId.
 *
 * Auth: `VIDEO_PROVIDER_WEBHOOK_SECRET` via header
 * `x-pikbo-webhook-secret` or `Authorization: Bearer …`.
 * Production/Vercel production refuses unsigned webhooks (Stripe parity).
 * Local/dev may omit the secret for harness tests only.
 */
export async function POST(req: Request) {
  const expected = process.env.VIDEO_PROVIDER_WEBHOOK_SECRET?.trim();
  const productionHost =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (productionHost && !expected) {
    return NextResponse.json(
      {
        ok: false,
        code: "WEBHOOK_NOT_CONFIGURED",
        error:
          "VIDEO_PROVIDER_WEBHOOK_SECRET is required in production — unsigned provider webhooks are refused",
      },
      { status: 503 }
    );
  }

  if (expected) {
    const header =
      req.headers.get("x-pikbo-webhook-secret")?.trim() ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (header !== expected) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", error: "Invalid webhook secret" },
        { status: 401 }
      );
    }
  }

  let body: WebhookBody = {};
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", error: "Expected JSON body" },
      { status: 400 }
    );
  }

  const eventId =
    (typeof body.eventId === "string" && body.eventId) ||
    (typeof body.id === "string" && body.id) ||
    "";
  const requestId =
    (typeof body.requestId === "string" && body.requestId) ||
    (typeof body.jobId === "string" && body.jobId) ||
    "";
  const rawStatus = (body.status || "").toLowerCase();
  const status: "succeeded" | "failed" | "canceled" | null =
    rawStatus === "succeeded" ||
    rawStatus === "completed" ||
    rawStatus === "ok"
      ? "succeeded"
      : rawStatus === "failed" || rawStatus === "error"
        ? "failed"
        : rawStatus === "canceled" || rawStatus === "cancelled"
          ? "canceled"
          : null;

  if (!status) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS",
        error: "status must be succeeded|failed|canceled (or completed/error)",
      },
      { status: 400 }
    );
  }

  const result = applyProviderWebhookEvent({
    eventId,
    requestId,
    status,
    videoUrl:
      typeof body.videoUrl === "string" ? body.videoUrl.slice(0, 2000) : undefined,
    error: typeof body.error === "string" ? body.error.slice(0, 500) : undefined,
    errorCode:
      typeof body.errorCode === "string"
        ? body.errorCode.slice(0, 64)
        : undefined,
    demo: body.demo === true,
    watermark: body.watermark,
    model: typeof body.model === "string" ? body.model.slice(0, 120) : undefined,
    provider:
      typeof body.provider === "string"
        ? body.provider.slice(0, 64)
        : "video-provider",
  });

  if (!result.ok) {
    const statusCode =
      result.code === "JOB_NOT_FOUND"
        ? 404
        : result.code === "UNSAFE_URL"
          ? 422
          : result.code === "INVALID_PAYLOAD" || result.code === "MISSING_VIDEO"
            ? 400
            : 500;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.message,
        phase: "D",
      },
      { status: statusCode }
    );
  }

  // Public view without session. Withheld/orphan live success never exposes
  // a free deliverable URL (R1b/R1c). Ops still get status + withheld flag.
  const job = result.job
    ? toPublicJob(result.job, result.job.sessionId)
    : null;

  return NextResponse.json({
    ok: true,
    phase: "D",
    mode: "local-memory",
    durable: false,
    duplicate: result.duplicate,
    message: result.message,
    /** R1b/R1c: late/orphan live success is withheld (not a free clip). */
    withheld: result.withheld === true,
    job,
    note:
      "Idempotent by eventId. Soft-launch generate settles inline. Orphan/late live success is withheld (no free delivery); durable R1c recon owns settlement after SQL apply.",
    secretConfigured: Boolean(expected),
  });
}
