import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  downloadAllowedForJob,
  findJobByRequestOrId,
  sweepTimedOutJobs,
} from "@/lib/generationJobs";
import {
  freeLiveDownloadBlockReason,
  isSafeDeliverableUrl,
} from "@/lib/createTrust";
import { t6Report } from "@/lib/t6Watermark";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import {
  getPrivateGenerationResult,
  signedPrivateResultUrl,
} from "@/lib/privateGenerationResults";

export const runtime = "nodejs";
export const maxDuration = 120;

type Props = { params: Promise<{ id: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function privateResultForRequest(req: Request, id: string) {
  if (!isUuid(id)) return { kind: "not-private" as const };
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return {
      kind: "error" as const,
      status: 401,
      code: "AUTH_REQUIRED",
    };
  }
  const result = await getPrivateGenerationResult({
    jobId: id,
    userId: user.id,
  });
  if (!result) {
    return {
      kind: "error" as const,
      status: 404,
      code: "NOT_FOUND",
    };
  }
  return { kind: "private" as const, result };
}

/**
 * Resolve relative /demos paths against the request origin.
 * NextResponse.redirect requires an absolute URL in edge/runtime edge cases.
 */
function absoluteDeliverableUrl(req: Request, videoUrl: string): string {
  const t = videoUrl.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") && !t.startsWith("//")) {
    try {
      return new URL(t, new URL(req.url).origin).toString();
    } catch {
      return t;
    }
  }
  return t;
}

type GateOk = {
  ok: true;
  videoUrl: string;
  demo: boolean;
  watermark: boolean;
};
type GateFail = {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

function gateDownload(
  sessionId: string,
  id: string
): GateOk | GateFail {
  sweepTimedOutJobs();
  const job = findJobByRequestOrId(id);
  if (!job || job.sessionId !== sessionId) {
    return {
      ok: false,
      status: 404,
      body: {
        ok: false,
        code: "NOT_FOUND",
        error: "Download not found for this session",
      },
    };
  }
  if (job.status !== "succeeded" || !job.videoUrl) {
    // Honest status codes for Library HEAD toasts (not a blanket NOT_READY).
    if (job.status === "canceled") {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "CANCELED",
          error:
            "Job was canceled — no deliverable. Check balance if a live debit is unconfirmed.",
          status: job.status,
          creditsOutcome: job.creditsOutcome,
          // Cancel always stamps refund unconfirmed on the ledger (fail parity).
          ...(job.creditsOutcome === "refund unconfirmed" ||
          job.creditsRefunded !== true
            ? { refundUnconfirmed: true }
            : {}),
        },
      };
    }
    if (job.status === "queued" || job.status === "running") {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "JOB_IN_FLIGHT",
          error: "Job still running — download unlocks after success",
          status: job.status,
        },
      };
    }
    if (job.status === "failed") {
      // R1b/R1c: withheld late/orphan provider success is not a free download.
      if (
        job.errorCode === "WITHHELD_ORPHAN" ||
        job.errorCode === "REQUEST_CANCELED" ||
        (job.errorCode === "TIMEOUT" && /withheld/i.test(job.error || ""))
      ) {
        return {
          ok: false,
          status: 409,
          body: {
            ok: false,
            code:
              job.errorCode === "WITHHELD_ORPHAN"
                ? "WITHHELD_ORPHAN"
                : job.errorCode === "REQUEST_CANCELED"
                  ? "REQUEST_CANCELED"
                  : "TIMEOUT",
            error:
              job.error ||
              "Provider output is withheld — not downloadable. Settlement remains unconfirmed until durable reconciliation.",
            status: job.status,
            withheld: true,
            creditsOutcome: job.creditsOutcome,
            ...(job.creditsOutcome === "refund unconfirmed"
              ? { refundUnconfirmed: true }
              : {}),
          },
        };
      }
      const code =
        job.errorCode === "TIMEOUT" || job.errorCode === "PROVIDER_TIMEOUT"
          ? "TIMEOUT"
          : job.errorCode === "PROVIDER_NETWORK"
            ? "PROVIDER_NETWORK"
            : job.errorCode || "GENERATION_FAILED";
      // Honest HTTP: timeout 504 · provider blip 503 · other terminal fails 409.
      const status =
        code === "TIMEOUT" || code === "PROVIDER_TIMEOUT"
          ? 504
          : code === "PROVIDER_NETWORK"
            ? 503
            : 409;
      return {
        ok: false,
        status,
        body: {
          ok: false,
          code,
          error:
            job.error ||
            "Job failed — no deliverable. Check balance if refund is unconfirmed.",
          status: job.status,
          creditsOutcome: job.creditsOutcome,
          creditsRefunded: job.creditsRefunded,
          ...(job.creditsOutcome === "refund unconfirmed"
            ? { refundUnconfirmed: true }
            : {}),
        },
      };
    }
    return {
      ok: false,
      status: 409,
      body: {
        ok: false,
        code: "NOT_READY",
        error: "Job has no successful deliverable",
        status: job.status,
      },
    };
  }
  // Live recompute — only an attached, verified owned derivative can unlock
  // a Free live delivery. Worker URLs and operator flags never unlock raw.
  const allowed = downloadAllowedForJob({
    demo: job.demo,
    watermark: job.watermark,
    status: job.status,
    jobId: job.id,
    providerRequestId: job.requestId,
    bakedDerivative: job.bakedDerivative,
  });
  if (!allowed) {
    const t6 = t6Report();
    return {
      ok: false,
      status: 403,
      body: {
        ok: false,
        code: "DOWNLOAD_BLOCKED",
        error: freeLiveDownloadBlockReason(),
        t6: t6.freeLiveRawDownload,
        watermark: job.watermark,
        demo: job.demo,
      },
    };
  }
  const deliverable =
    job.watermark && !job.demo
      ? job.bakedDerivative?.deliveryPath
      : job.videoUrl;
  if (!deliverable || !isSafeDeliverableUrl(deliverable)) {
    return {
      ok: false,
      status: 422,
      body: {
        ok: false,
        code: "UNSAFE_URL",
        error: "Verified owned derivative is not a safe deliverable",
      },
    };
  }
  return {
    ok: true,
    videoUrl: deliverable,
    demo: job.demo,
    watermark: job.watermark,
  };
}

/**
 * Phase E gate — controlled download authorization.
 * Free live raw provider URLs are never returned. Cached demos and paid
 * (no-watermark) outputs may redirect to their known output URL.
 * Accepts job id or provider requestId (Create/Library may store either).
 */
export async function GET(req: Request, { params }: Props) {
  const { id } = await params;
  const privateResult = await privateResultForRequest(req, id);
  if (privateResult.kind === "error") {
    return NextResponse.json(
      {
        ok: false,
        code: privateResult.code,
        error:
          privateResult.code === "AUTH_REQUIRED"
            ? "Sign in to download this private result"
            : "Private result not found for this account",
      },
      { status: privateResult.status }
    );
  }
  if (privateResult.kind === "private") {
    const signed = await signedPrivateResultUrl(
      privateResult.result.objectKey,
      60,
      `pikbo-${privateResult.result.effect.slice(0, 32)}.mp4`
    );
    if (!signed) {
      return NextResponse.json(
        {
          ok: false,
          code: "PRIVATE_RESULT_SIGN_FAILED",
          error: "Could not create a private download link",
        },
        { status: 503 }
      );
    }
    return NextResponse.redirect(signed, 302);
  }
  const session = await ensureSession();
  const gate = gateDownload(session.id, id);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  // Absolute URL so relative /demos/* never fail as open redirects / invalid Location.
  const target = absoluteDeliverableUrl(req, gate.videoUrl);
  return NextResponse.redirect(target, 302);
}

/**
 * Metadata probe without following the deliverable — Library can HEAD before
 * navigating. Same authorization as GET.
 * Failures expose code via X-Pikbo-Download-Code for honest client toasts.
 */
export async function HEAD(req: Request, { params }: Props) {
  const { id } = await params;
  const privateResult = await privateResultForRequest(req, id);
  if (privateResult.kind === "error") {
    return new NextResponse(null, {
      status: privateResult.status,
      headers: {
        "X-Pikbo-Download": "blocked",
        "X-Pikbo-Download-Code": privateResult.code,
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (privateResult.kind === "private") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "X-Pikbo-Download": "allowed",
        "X-Pikbo-Demo": "0",
        "X-Pikbo-Watermark": "0",
        "X-Pikbo-Private-Result": "1",
        "X-Pikbo-Result-Sha256":
          privateResult.result.checksum.slice(0, 16),
        "Cache-Control": "private, no-store",
      },
    });
  }
  const session = await ensureSession();
  const gate = gateDownload(session.id, id);
  const t6 = t6Report();
  if (!gate.ok) {
    const code =
      typeof gate.body.code === "string" ? gate.body.code : "BLOCKED";
    const jobStatus =
      typeof gate.body.status === "string" ? gate.body.status : "";
    const creditsOutcome =
      typeof gate.body.creditsOutcome === "string"
        ? gate.body.creditsOutcome
        : "";
    return new NextResponse(null, {
      status: gate.status,
      headers: {
        "X-Pikbo-Download": "blocked",
        "X-Pikbo-Download-Code": code,
        ...(jobStatus ? { "X-Pikbo-Job-Status": jobStatus } : {}),
        ...(creditsOutcome
          ? { "X-Pikbo-Credits-Outcome": creditsOutcome }
          : {}),
        "X-Pikbo-T6": t6.freeLiveRawDownload,
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "X-Pikbo-Download": "allowed",
      "X-Pikbo-Demo": gate.demo ? "1" : "0",
      "X-Pikbo-Watermark": gate.watermark ? "1" : "0",
      "X-Pikbo-T6": t6.freeLiveRawDownload,
      "X-Pikbo-Bake": "0",
      "Cache-Control": "no-store",
    },
  });
}
