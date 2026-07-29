import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireDurableProviderSpendReservations } from "@/lib/durableProviderBudget";

export const runtime = "nodejs";

function workerAuthorized(req: Request): boolean {
  const secret = process.env.PIKBO_INTERNAL_WORKER_SECRET || "";
  if (secret.length < 24) return false;
  const supplied = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  const suppliedBuffer = Buffer.from(supplied);
  const secretBuffer = Buffer.from(secret);
  if (suppliedBuffer.byteLength !== secretBuffer.byteLength) return false;
  return timingSafeEqual(suppliedBuffer, secretBuffer);
}

/**
 * Worker-only crash recovery for provider-budget leases. The request can only
 * bound batch size; account, user, reservation, amount, and expiry cutoff are
 * selected inside the service-role-only database function.
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
  const result = await expireDurableProviderSpendReservations({
    limit: body.limit,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true, ...result.data });
}
