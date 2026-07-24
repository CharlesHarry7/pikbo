import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { findJobByRequestOrId, sweepTimedOutJobs } from "@/lib/generationJobs";
import {
  canDownloadResult,
  freeLiveDownloadBlockReason,
  isSafeDeliverableUrl,
} from "@/lib/createTrust";
import { bakeWatermarkedVideo, watermarkWorkerUrl } from "@/lib/t6Bake";
import { t6Report } from "@/lib/t6Watermark";

export const runtime = "nodejs";
export const maxDuration = 120;

type Props = { params: Promise<{ id: string }> };

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
  // Live recompute — do not trust job.downloadAllowed frozen at success time.
  // Worker URL / PIKBO_T6_FILE_BAKE can flip after the row was written.
  const allowed = canDownloadResult({
    demo: job.demo,
    watermark: job.watermark,
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
  if (!isSafeDeliverableUrl(job.videoUrl)) {
    return {
      ok: false,
      status: 422,
      body: {
        ok: false,
        code: "UNSAFE_URL",
        error: "Deliverable URL is not a safe redirect target",
      },
    };
  }
  return {
    ok: true,
    videoUrl: job.videoUrl,
    demo: job.demo,
    watermark: job.watermark,
  };
}

/**
 * Phase E gate — controlled download authorization.
 * Free live raw provider URLs are never returned (T6 still blocked for bake).
 * Cached demos and paid (no watermark) may redirect to the known output URL.
 * Accepts job id or provider requestId (Create/Library may store either).
 */
export async function GET(req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const gate = gateDownload(session.id, id);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  // Free live + watermark: never hand raw provider URL unless operator force-ready.
  let deliverable = gate.videoUrl;
  const freeLiveWatermark = gate.watermark && !gate.demo;
  const forceBakeReady = process.env.PIKBO_T6_FILE_BAKE === "1";
  if (freeLiveWatermark && !forceBakeReady) {
    const worker = watermarkWorkerUrl();
    if (!worker) {
      // Defense: canDownloadResult should already have blocked — never raw free.
      return NextResponse.json(
        {
          ok: false,
          code: "DOWNLOAD_BLOCKED",
          error: freeLiveDownloadBlockReason(),
          t6: "blocked",
        },
        { status: 403 }
      );
    }
    const baked = await bakeWatermarkedVideo({
      videoUrl: absoluteDeliverableUrl(req, gate.videoUrl),
      jobId: id,
    });
    if (!baked.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "T6_BAKE_FAILED",
          error: baked.error,
          t6: "bake_failed",
        },
        { status: 502 }
      );
    }
    deliverable = baked.bakedUrl;
  }

  // Absolute URL so relative /demos/* never fail as open redirects / invalid Location.
  const target = absoluteDeliverableUrl(req, deliverable);
  return NextResponse.redirect(target, 302);
}

/**
 * Metadata probe without following the deliverable — Library can HEAD before
 * navigating. Same authorization as GET.
 * Failures expose code via X-Pikbo-Download-Code for honest client toasts.
 */
export async function HEAD(_req: Request, { params }: Props) {
  const { id } = await params;
  const session = await ensureSession();
  const gate = gateDownload(session.id, id);
  const t6 = t6Report();
  if (!gate.ok) {
    const code =
      typeof gate.body.code === "string" ? gate.body.code : "BLOCKED";
    return new NextResponse(null, {
      status: gate.status,
      headers: {
        "X-Pikbo-Download": "blocked",
        "X-Pikbo-Download-Code": code,
        "X-Pikbo-T6": t6.freeLiveRawDownload,
        "Cache-Control": "no-store",
      },
    });
  }
  const needsBake =
    gate.watermark &&
    !gate.demo &&
    process.env.PIKBO_T6_FILE_BAKE !== "1" &&
    Boolean(watermarkWorkerUrl());
  return new NextResponse(null, {
    status: 200,
    headers: {
      "X-Pikbo-Download": "allowed",
      "X-Pikbo-Demo": gate.demo ? "1" : "0",
      "X-Pikbo-Watermark": gate.watermark ? "1" : "0",
      "X-Pikbo-T6": t6.freeLiveRawDownload,
      "X-Pikbo-Bake": needsBake ? "1" : "0",
      "Cache-Control": "no-store",
    },
  });
}
