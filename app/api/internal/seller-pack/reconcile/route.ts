import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireAtomicSellerPackQueuedChildren } from "@/lib/durableCredits/sellerPackAtomic";
import {
  discoverSellerPackResults,
  reconcileSellerPackCases,
} from "@/lib/durableCredits/sellerPackReconciliation";

export const runtime = "nodejs";

function workerAuthorized(req: Request): boolean {
  const secret = process.env.PIKBO_INTERNAL_WORKER_SECRET || "";
  if (secret.length < 24) return false;
  const supplied = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  const suppliedBytes = Buffer.from(supplied);
  const secretBytes = Buffer.from(secret);
  if (suppliedBytes.byteLength !== secretBytes.byteLength) return false;
  return timingSafeEqual(suppliedBytes, secretBytes);
}

/**
 * Worker-only reconciliation entrypoint. It expires queued/unstarted work and
 * finishes only previously persisted Pack capture/release cases. It accepts no
 * wallet amount, user id, reservation id, pack id, or job id from the caller.
 */
export async function POST(req: Request) {
  if (!workerAuthorized(req)) {
    return NextResponse.json(
      { ok: false, code: "WORKER_AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  let body: { limit?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  // Discovery commits in its own RPC transaction before finishing. This
  // closes the attach-before-capture crash window without reversing the
  // pack -> job -> reconciliation lock order.
  const discovery = await discoverSellerPackResults({
    limit: body.limit,
  });
  if (!discovery.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: discovery.code,
        error: discovery.error,
      },
      { status: 503 }
    );
  }
  const reconciliation = await reconcileSellerPackCases({
    limit: body.limit,
  });
  if (!reconciliation.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: reconciliation.code,
        error: reconciliation.error,
      },
      { status: 503 }
    );
  }
  const result = await expireAtomicSellerPackQueuedChildren({
    limit: body.limit,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ok: true,
    releasedJobs: result.data.releasedJobs,
    releasedCredits: result.data.releasedCredits,
    discovery: discovery.data,
    reconciliation: reconciliation.data,
  });
}
