import { NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { findJobByOwnedDerivative } from "@/lib/generationJobs";
import {
  t6OwnedObjectKeyFromRouteParam,
  readT6OwnedDerivative,
} from "@/lib/t6OwnedStorage";
import { canServeVerifiedT6Derivative } from "@/lib/t6Worker";

export const runtime = "nodejs";

type Props = { params: Promise<{ hash: string }> };

async function authorizedOwnedObject(req: Request, hash: string) {
  const objectKey = t6OwnedObjectKeyFromRouteParam(hash);
  if (!objectKey) {
    return { ok: false as const, status: 404, code: "NOT_FOUND" };
  }
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return { ok: false as const, status: 401, code: "AUTH_REQUIRED" };
  }
  const session = await ensureSession();
  const job = findJobByOwnedDerivative(session.id, objectKey);
  if (
    !job ||
    !job.requestId ||
    !job.bakedDerivative ||
    !canServeVerifiedT6Derivative({
      jobId: job.id,
      providerRequestId: job.requestId,
      derivative: job.bakedDerivative,
    })
  ) {
    return { ok: false as const, status: 404, code: "NOT_FOUND" };
  }
  const expectedChecksum = job.bakedDerivative.outputChecksum;
  if (!expectedChecksum) {
    return {
      ok: false as const,
      status: 409,
      code: "DERIVATIVE_UNVERIFIED",
    };
  }
  const stored = await readT6OwnedDerivative(objectKey, expectedChecksum);
  if (!stored.ok) {
    return { ok: false as const, status: 409, code: stored.code };
  }
  return { ok: true as const, job, object: stored.object };
}

export async function GET(req: Request, { params }: Props) {
  const { hash } = await params;
  const result = await authorizedOwnedObject(req, hash);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: "Verified watermarked derivative is not available",
      },
      {
        status: result.status,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
  return new NextResponse(Buffer.from(result.object.bytes), {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(result.object.bytes.byteLength),
      "Content-Disposition": `attachment; filename="pikbo-${hash.slice(0, 12)}.mp4"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Pikbo-Deliverable": "verified-watermarked-derivative",
    },
  });
}

export async function HEAD(req: Request, { params }: Props) {
  const { hash } = await params;
  const result = await authorizedOwnedObject(req, hash);
  if (!result.ok) {
    return new NextResponse(null, {
      status: result.status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Pikbo-Download": "blocked",
        "X-Pikbo-Download-Code": result.code,
      },
    });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(result.object.bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Pikbo-Download": "allowed",
      "X-Pikbo-Deliverable": "verified-watermarked-derivative",
    },
  });
}
