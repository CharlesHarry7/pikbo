import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  claimDurableReconciliation,
  finishDurableReconciliation,
} from "@/lib/durableCredits/reconciliation";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type ReconcileCounts = {
  claimed: number;
  processed: number;
  captured: number;
  released: number;
  failed: number;
};

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

function requestedLimit(body: unknown): number {
  if (!body || typeof body !== "object") return DEFAULT_LIMIT;
  const raw = (body as { limit?: unknown }).limit;
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

function newWorkerId(): string {
  const region = process.env.VERCEL_REGION?.trim() || "node";
  return `generation-reconcile:${region}:${randomUUID()}`.slice(0, 120);
}

function unavailable(
  code: string,
  counts: ReconcileCounts,
  status = 503
) {
  return NextResponse.json(
    {
      ok: false,
      code,
      error: "Generation reconciliation is unavailable",
      ...counts,
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

/**
 * Worker-only settlement replay for single-generation R1c cases.
 *
 * The caller can request only a bounded work count. Job, reservation, user and
 * lease identifiers always come from the service-role claim RPC; none are
 * accepted from the request body or returned to a browser.
 */
export async function POST(req: Request) {
  if (!workerAuthorized(req)) {
    return NextResponse.json(
      { ok: false, code: "WORKER_AUTH_REQUIRED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const limit = requestedLimit(body);
  const workerId = newWorkerId();
  const counts: ReconcileCounts = {
    claimed: 0,
    processed: 0,
    captured: 0,
    released: 0,
    failed: 0,
  };

  for (let index = 0; index < limit; index += 1) {
    let claimed: Awaited<ReturnType<typeof claimDurableReconciliation>>;
    try {
      claimed = await claimDurableReconciliation({
        workerId,
        leaseSeconds: 60,
      });
    } catch {
      return unavailable("DURABLE_RECONCILIATION_UNAVAILABLE", counts);
    }
    if (!claimed.ok) {
      if (claimed.code === "NO_CLAIMABLE_CASE") break;
      return unavailable(claimed.code, counts);
    }

    counts.claimed += 1;
    const capture =
      claimed.data.state === "capture_pending" &&
      claimed.data.providerOutcome === "succeeded";
    const release =
      claimed.data.state === "release_pending" &&
      claimed.data.providerOutcome === "failed";
    if (!capture && !release) {
      counts.failed += 1;
      return unavailable("RECONCILIATION_STATE_MISMATCH", counts);
    }
    const action = capture ? "capture" : "release";
    let finished: Awaited<
      ReturnType<typeof finishDurableReconciliation>
    >;
    try {
      finished = await finishDurableReconciliation({
        workerId,
        leaseToken: claimed.data.leaseToken,
        jobId: claimed.data.jobId,
        action,
      });
    } catch {
      counts.failed += 1;
      return unavailable("DURABLE_RECONCILIATION_UNAVAILABLE", counts);
    }
    if (!finished.ok) {
      counts.failed += 1;
      return unavailable(finished.code, counts);
    }

    counts.processed += 1;
    if (finished.data.state === "captured") {
      counts.captured += 1;
    } else if (finished.data.state === "released") {
      counts.released += 1;
    } else {
      // A successful RPC must end in a terminal financial state. Never report
      // a non-terminal or malformed response as settled work.
      counts.failed += 1;
      return unavailable("RECONCILIATION_NON_TERMINAL", counts);
    }
  }

  return NextResponse.json(
    { ok: true, limit, ...counts },
    { headers: { "Cache-Control": "no-store" } }
  );
}
