import { NextResponse } from "next/server";
import type { GenerateErrorBody, GenerateSuccess } from "@/lib/contracts";
import {
  getPrivateGenerationRecovery,
  signedPrivateResultUrl,
} from "@/lib/privateGenerationResults";
import { ensureSession, publicSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function normalizedIdempotencyKey(req: Request): string | null {
  const value = new URL(req.url).searchParams.get("idempotencyKey")?.trim();
  if (!value || value.length < 8 || value.length > 128) return null;
  return value;
}

/**
 * Read-only owner recovery for an already-submitted private generation.
 * It never reserves credits, invokes a provider, or exposes storage keys/raw
 * provider URLs. The client uses it only when the original POST is slow.
 */
export async function GET(req: Request) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json<GenerateErrorBody>(
      {
        error: "Sign in to recover this private generation",
        code: "AUTH_REQUIRED",
      },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }
  const idempotencyKey = normalizedIdempotencyKey(req);
  if (!idempotencyKey) {
    return NextResponse.json<GenerateErrorBody>(
      {
        error: "A valid generation attempt key is required",
        code: "INVALID_REQUEST",
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const recovery = await getPrivateGenerationRecovery({
    userId: user.id,
    idempotencyKey,
  });
  if (recovery.state === "not_found") {
    return NextResponse.json(
      { ok: false, recoveryState: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }
  if (recovery.state === "unavailable") {
    return NextResponse.json<GenerateErrorBody>(
      {
        error:
          "Pikbo could not read the saved generation state yet. The original generation was not canceled.",
        code: "DELIVERY_PIPELINE_UNAVAILABLE",
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
  if (recovery.state === "pending") {
    return NextResponse.json(
      {
        ok: true,
        recoveryState: "pending",
        jobId: recovery.jobId,
        status: recovery.status,
      },
      { status: 202, headers: NO_STORE_HEADERS }
    );
  }
  const session = await ensureSession();
  if (recovery.state === "failed") {
    if (!recovery.creditsRefunded) {
      return NextResponse.json<GenerateErrorBody>(
        {
          error:
            "This generation is canceled, but its credit settlement is not confirmed yet. Check balance before retrying.",
          code: "REQUEST_CANCELED",
          jobId: recovery.jobId,
          session: publicSession(session),
          refundUnconfirmed: true,
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json<GenerateErrorBody>(
      {
        error:
          "This generation failed and its reserved credits were released. Start a new Retry attempt.",
        code: "GENERATION_FAILED",
        jobId: recovery.jobId,
        session: publicSession(session),
        creditsRefunded: recovery.creditsRefunded,
      },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }

  const { result } = recovery;
  const signedUrl = await signedPrivateResultUrl(result.objectKey);
  if (!signedUrl) {
    return NextResponse.json<GenerateErrorBody>(
      {
        error:
          "The private result exists, but Pikbo could not open its owner download yet. No new generation was started.",
        code: "DELIVERY_PIPELINE_UNAVAILABLE",
        jobId: result.jobId,
        session: publicSession(session),
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json<GenerateSuccess>(
    {
      videoUrl: signedUrl,
      demo: false,
      watermark: false,
      model: result.model,
      duration: result.duration,
      aspectRatio: result.aspectRatio,
      resolution: result.resolution,
      session: publicSession(session),
      requestId: result.jobId,
      jobId: result.jobId,
      providerRequestId: result.providerRequestId,
      provider: "bytedance-seedance",
      effect: result.effect,
      costCredits: 10,
      creditsOutcome: "10 used",
      idempotentReplay: true,
      processedUpload: true,
      privateResult: true,
    },
    { headers: NO_STORE_HEADERS }
  );
}
