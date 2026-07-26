import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Browser-originated terminal accounting is deliberately disabled. Only a
 * future server-owned generation job worker may invoke the durable RPC.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "SERVER_OWNED_JOBS_REQUIRED",
      disabled: true,
      authority: "server-owned-jobs",
      error: "Seller Pack settlement is performed only by server-owned jobs.",
    },
    { status: 409 }
  );
}
