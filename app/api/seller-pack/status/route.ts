import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { durableCreditsActive } from "@/lib/durableCredits";
import { getSellerPackStatusAtomic } from "@/lib/durableCredits/sellerPack";
import {
  getPrivateGenerationResult,
  signedPrivateResultUrl,
} from "@/lib/privateGenerationResults";

export const runtime = "nodejs";

/**
 * Owner-scoped pack status for refresh recovery.
 * Returns the same pack run + public child state. Signed result URLs only for
 * owner-bound private successes. Cross-account pack access is rejected.
 */
export async function GET(req: Request) {
  const session = await ensureSession();
  const auth = await getAuthUserFromRequest(req);
  if (!auth?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_REQUIRED",
        error: "Sign in to recover a Launch Pack",
        session: publicSession(session),
      },
      { status: 401 }
    );
  }
  if (!durableCreditsActive()) {
    return NextResponse.json(
      {
        ok: false,
        code: "DURABLE_OFF",
        error: "Durable credits unavailable",
        session: publicSession(session),
      },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const packRunId = (url.searchParams.get("packRunId") || "").trim();
  if (packRunId.length < 8) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REQUEST",
        error: "packRunId query parameter required",
      },
      { status: 400 }
    );
  }

  const status = await getSellerPackStatusAtomic({
    userId: auth.id,
    packRunId,
  });
  if (!status.ok) {
    const http =
      status.code === "PACK_NOT_FOUND"
        ? 404
        : status.code === "AUTH_REQUIRED"
          ? 401
          : 400;
    return NextResponse.json(
      {
        ok: false,
        code: status.code,
        error: status.error,
        session: publicSession(session),
      },
      { status: http }
    );
  }

  const jobs = [];
  for (const job of status.data.jobs) {
    let resultUrl: string | null = null;
    if (job.status === "succeeded" && job.hasPrivateResult) {
      const privateResult = await getPrivateGenerationResult({
        jobId: job.jobId,
        userId: auth.id,
      });
      if (privateResult) {
        resultUrl = await signedPrivateResultUrl(privateResult.objectKey);
      }
    }
    jobs.push({
      jobId: job.jobId,
      childKey: job.childKey,
      effectSlug: job.effectSlug,
      aspectRatio: job.aspectRatio,
      durationSec: job.durationSec,
      status: job.status,
      quotedCredits: job.quotedCredits,
      settledCredits: job.settledCredits,
      errorCode: job.errorCode ?? null,
      attemptKey: job.attemptKey,
      modelId: job.modelId ?? null,
      resolution: job.resolution ?? null,
      hasPrivateResult: job.hasPrivateResult === true,
      // Owner-signed Pikbo private URL only — never a raw provider URL.
      resultUrl,
    });
  }

  return NextResponse.json({
    ok: true,
    packRunId: status.data.packRunId,
    status: status.data.status,
    quotedCredits: status.data.quotedCredits,
    settledCredits: status.data.settledCredits,
    releasedCredits: status.data.releasedCredits,
    reservationId: status.data.reservationId,
    contractFingerprint: status.data.contractFingerprint,
    clientPackKey: status.data.clientPackKey,
    mode: status.data.mode,
    createdAt: status.data.createdAt,
    completedAt: status.data.completedAt,
    availableCredits: status.data.availableCredits,
    reservedCredits: status.data.reservedCredits,
    jobs,
    session: publicSession(session),
  });
}

export async function POST(req: Request) {
  let body: { packRunId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const packRunId =
    typeof body.packRunId === "string" ? body.packRunId.trim() : "";
  const url = new URL(req.url);
  if (packRunId) url.searchParams.set("packRunId", packRunId);
  return GET(new Request(url.toString(), { headers: req.headers }));
}
