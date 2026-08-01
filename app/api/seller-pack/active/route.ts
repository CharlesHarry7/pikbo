import { NextResponse } from "next/server";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { durableCreditsActive } from "@/lib/durableCredits";
import { getActiveSellerPackAtomic } from "@/lib/durableCredits/sellerPack";
import {
  getPrivateGenerationResult,
  signedPrivateResultUrl,
} from "@/lib/privateGenerationResults";

export const runtime = "nodejs";

/**
 * Discover this owner's newest running/partial/failed Pack without relying on
 * sessionStorage. Read-only: it cannot reserve credits or call the provider.
 */
export async function GET(req: Request) {
  const session = await ensureSession();
  const auth = await getAuthUserFromRequest(req);
  if (!auth?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_REQUIRED",
        error: "Sign in to recover an active Launch Pack",
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
        error: "Durable Pack recovery is unavailable",
        session: publicSession(session),
      },
      { status: 503 }
    );
  }

  const active = await getActiveSellerPackAtomic({ userId: auth.id });
  if (!active.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: active.code,
        error:
          active.code === "ACTIVE_PACK_NOT_FOUND"
            ? "No active Launch Pack"
            : active.error,
        session: publicSession(session),
      },
      {
        status:
          active.code === "ACTIVE_PACK_NOT_FOUND"
            ? 404
            : active.code === "AUTH_REQUIRED"
              ? 401
              : 400,
      }
    );
  }

  const jobs = [];
  for (const job of active.data.jobs) {
    let resultUrl: string | null = null;
    if (job.status === "succeeded" && job.hasPrivateResult) {
      const result = await getPrivateGenerationResult({
        jobId: job.jobId,
        userId: auth.id,
      });
      if (result) {
        resultUrl = await signedPrivateResultUrl(result.objectKey);
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
      resolution: job.resolution ?? null,
      hasPrivateResult: job.hasPrivateResult === true,
      resultUrl,
    });
  }

  return NextResponse.json({
    ok: true,
    packRunId: active.data.packRunId,
    status: active.data.status,
    quotedCredits: active.data.quotedCredits,
    settledCredits: active.data.settledCredits,
    releasedCredits: active.data.releasedCredits,
    createdAt: active.data.createdAt,
    input: {
      skuLabel: active.data.inputSkuLabel,
    },
    jobs,
    session: publicSession(session),
  });
}
